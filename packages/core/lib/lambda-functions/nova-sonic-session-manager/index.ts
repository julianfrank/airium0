import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const WEBSOCKET_API_ID = process.env.WEBSOCKET_API_ID!;
const VOICE_SESSIONS_TABLE_NAME = process.env.VOICE_SESSIONS_TABLE_NAME!;
const AUDIO_STORAGE_BUCKET = process.env.AUDIO_STORAGE_BUCKET!;
const region = process.env.AWS_REGION || 'us-east-1';

const apiGatewayClient = new ApiGatewayManagementApiClient({
  endpoint: `https://${WEBSOCKET_API_ID}.execute-api.${region}.amazonaws.com/prod`,
});

interface VoiceSession {
  PK: string;
  SK: string;
  sessionId: string;
  novaSonicSessionId: string;
  connectionId: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ERROR';
  createdAt: string;
  updatedAt: string;
  audioFormat?: string;
  totalDuration?: number;
  messageCount?: number;
}

interface SessionEvent {
  action: 'create' | 'update' | 'end' | 'get' | 'list';
  sessionId?: string;
  connectionId?: string;
  userId?: string;
  data?: any;
}

export const handler: Handler = async (event: SessionEvent) => {
  console.log('Nova Sonic session manager event:', JSON.stringify(event, null, 2));

  try {
    const { action, sessionId, connectionId, userId, data } = event;

    switch (action) {
      case 'create':
        return await createVoiceSession(connectionId!, userId!, data);
      case 'update':
        return await updateVoiceSession(sessionId!, data);
      case 'end':
        return await endVoiceSession(sessionId!);
      case 'get':
        return await getVoiceSession(sessionId!);
      case 'list':
        return await listUserVoiceSessions(userId!);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in Nova Sonic session manager:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function createVoiceSession(
  connectionId: string,
  userId: string,
  data: { audioFormat?: string; sessionConfig?: any }
): Promise<any> {
  const sessionId = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const novaSonicSessionId = `ns-${sessionId}`;
  const timestamp = new Date().toISOString();

  const voiceSession: VoiceSession = {
    PK: `VOICE#${sessionId}`,
    SK: 'METADATA',
    sessionId,
    novaSonicSessionId,
    connectionId,
    userId,
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
    audioFormat: data.audioFormat || 'webm',
    messageCount: 0,
  };

  // Store voice session in DynamoDB
  await docClient.send(new PutCommand({
    TableName: VOICE_SESSIONS_TABLE_NAME,
    Item: voiceSession,
  }));

  console.log(`Created voice session: ${sessionId} for user: ${userId}`);

  // Send session created event to WebSocket
  await sendToConnection(connectionId, {
    type: 'voice_session_created',
    sessionId,
    novaSonicSessionId,
    status: 'ACTIVE',
    audioFormat: voiceSession.audioFormat,
    timestamp,
  });

  // Publish event to AppSync Events (if available)
  await publishSessionEvent(sessionId, 'started', {
    novaSonicSessionId,
    audioFormat: voiceSession.audioFormat,
    userId,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      sessionId,
      novaSonicSessionId,
      status: 'ACTIVE',
    }),
  };
}

async function updateVoiceSession(sessionId: string, data: any): Promise<any> {
  const timestamp = new Date().toISOString();

  // Get current session
  const session = await getVoiceSession(sessionId);
  if (!session) {
    throw new Error(`Voice session not found: ${sessionId}`);
  }

  // Update session in DynamoDB
  let updateExpression = 'SET updatedAt = :updatedAt';
  const expressionAttributeValues: any = {
    ':updatedAt': timestamp,
  };

  // Add optional fields to update
  if (data.totalDuration !== undefined) {
    updateExpression += ', totalDuration = :totalDuration';
    expressionAttributeValues[':totalDuration'] = data.totalDuration;
  }

  if (data.messageCount !== undefined) {
    updateExpression += ', messageCount = :messageCount';
    expressionAttributeValues[':messageCount'] = data.messageCount;
  }

  if (data.status) {
    updateExpression += ', #status = :status';
    expressionAttributeValues[':status'] = data.status;
  }

  await docClient.send(new UpdateCommand({
    TableName: VOICE_SESSIONS_TABLE_NAME,
    Key: { PK: `VOICE#${sessionId}`, SK: 'METADATA' },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: data.status ? { '#status': 'status' } : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
  }));

  console.log(`Updated voice session: ${sessionId}`);

  // Send update to WebSocket if connection is still active
  if (session.connectionId) {
    try {
      await sendToConnection(session.connectionId, {
        type: 'voice_session_updated',
        sessionId,
        data,
        timestamp,
      });
    } catch (error) {
      console.warn(`Failed to send update to connection ${session.connectionId}:`, error);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ sessionId, updated: true }),
  };
}

async function endVoiceSession(sessionId: string): Promise<any> {
  const timestamp = new Date().toISOString();

  // Get current session
  const session = await getVoiceSession(sessionId);
  if (!session) {
    throw new Error(`Voice session not found: ${sessionId}`);
  }

  // Calculate total duration if not already set
  const totalDuration = session.totalDuration || 
    (new Date(timestamp).getTime() - new Date(session.createdAt).getTime()) / 1000;

  // Update session status to COMPLETED
  await docClient.send(new UpdateCommand({
    TableName: VOICE_SESSIONS_TABLE_NAME,
    Key: { PK: `VOICE#${sessionId}`, SK: 'METADATA' },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, totalDuration = :totalDuration',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'COMPLETED',
      ':updatedAt': timestamp,
      ':totalDuration': totalDuration,
    },
  }));

  console.log(`Ended voice session: ${sessionId}, duration: ${totalDuration}s`);

  // Send session ended event to WebSocket
  if (session.connectionId) {
    try {
      await sendToConnection(session.connectionId, {
        type: 'voice_session_ended',
        sessionId,
        status: 'COMPLETED',
        totalDuration,
        messageCount: session.messageCount || 0,
        timestamp,
      });
    } catch (error) {
      console.warn(`Failed to send end event to connection ${session.connectionId}:`, error);
    }
  }

  // Publish session completed event to AppSync Events
  await publishSessionEvent(sessionId, 'completed', {
    totalDuration,
    messageCount: session.messageCount || 0,
    userId: session.userId,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      sessionId,
      status: 'COMPLETED',
      totalDuration,
    }),
  };
}

async function getVoiceSession(sessionId: string): Promise<VoiceSession | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: VOICE_SESSIONS_TABLE_NAME,
      Key: { PK: `VOICE#${sessionId}`, SK: 'METADATA' },
    }));

    return result.Item as VoiceSession || null;
  } catch (error) {
    console.error(`Error getting voice session ${sessionId}:`, error);
    return null;
  }
}

async function listUserVoiceSessions(userId: string, limit: number = 20): Promise<any> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: VOICE_SESSIONS_TABLE_NAME,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessions: result.Items || [],
        count: result.Count || 0,
      }),
    };
  } catch (error) {
    console.error(`Error listing voice sessions for user ${userId}:`, error);
    throw error;
  }
}

async function sendToConnection(connectionId: string, data: any): Promise<void> {
  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data),
    });

    await apiGatewayClient.send(command);
    console.log(`Message sent to connection: ${connectionId}`);
  } catch (error) {
    console.error(`Error sending message to connection ${connectionId}:`, error);
    throw error;
  }
}

async function publishSessionEvent(sessionId: string, status: string, data: any): Promise<void> {
  try {
    // This would invoke the AppSync Events publisher if available
    // For now, we'll just log the event
    console.log(`Publishing session event: ${sessionId} - ${status}`, data);
    
    // TODO: Invoke AppSync Events publisher Lambda function when available
    // This will be implemented when AppSync Events integration is complete
  } catch (error) {
    console.error('Error publishing session event:', error);
    // Don't throw error to avoid breaking the main function
  }
}

// Utility function to generate S3 object URLs for audio upload/download
export async function generateAudioUrl(
  sessionId: string,
  fileName: string,
  operation: 'upload' | 'download'
): Promise<string> {
  const key = `voice-sessions/${sessionId}/${fileName}`;
  
  // For now, return the S3 object key - presigned URLs would require additional SDK
  // This can be enhanced later with proper presigned URL generation
  return `s3://${AUDIO_STORAGE_BUCKET}/${key}`;
}