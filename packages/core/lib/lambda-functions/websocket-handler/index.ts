import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE_NAME = process.env.CONNECTIONS_TABLE_NAME!;
const USER_POOL_ID = process.env.USER_POOL_ID!;
const IDENTITY_POOL_ID = process.env.IDENTITY_POOL_ID!;
const EVENT_PUBLISHER_FUNCTION_NAME = process.env.EVENT_PUBLISHER_FUNCTION_NAME;

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

// WebSocket message types
interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

interface VoiceStartMessage extends WebSocketMessage {
  type: 'voice_start';
  data: {
    audioFormat?: string;
    sessionId?: string;
  };
}

interface VoiceDataMessage extends WebSocketMessage {
  type: 'voice_data';
  data: {
    audioData: string; // Base64 encoded audio
    sessionId: string;
  };
}

interface VoiceEndMessage extends WebSocketMessage {
  type: 'voice_end';
  data: {
    sessionId: string;
  };
}

interface TextMessage extends WebSocketMessage {
  type: 'text_message';
  data: {
    content: string;
    sessionId?: string;
  };
}

interface ConnectionInfo {
  connectionId: string;
  userId: string;
  sessionId?: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastActivity: string;
  disconnectedAt?: string;
}

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, connectionId, domainName, stage } = event.requestContext;
  
  console.log(`Route: ${routeKey}, ConnectionId: ${connectionId}`);

  // Initialize API Gateway Management API client for sending messages back to clients
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(event);
      case '$disconnect':
        return await handleDisconnect(event);
      case '$default':
        return await handleMessage(event, apiGatewayClient);
      default:
        return { statusCode: 400, body: 'Unknown route' };
    }
  } catch (error) {
    console.error('Error handling WebSocket event:', error);
    
    // Try to send error message back to client
    try {
      await sendMessageToConnection(apiGatewayClient, connectionId, {
        type: 'error',
        data: { message: 'Internal server error' },
        timestamp: new Date().toISOString(),
      });
    } catch (sendError) {
      console.error('Failed to send error message to client:', sendError);
    }
    
    return { statusCode: 500, body: 'Internal server error' };
  }
};

async function handleConnect(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> {
  const { connectionId } = event.requestContext;
  
  try {
    // Extract user information from query parameters or headers
    const userId = event.queryStringParameters?.userId || 'anonymous';
    const sessionId = event.queryStringParameters?.sessionId;
    
    // Extract client information
    const ipAddress = event.requestContext.identity?.sourceIp;
    const userAgent = event.headers?.['User-Agent'] || event.headers?.['user-agent'];
    
    const connection: ConnectionInfo = {
      connectionId,
      userId,
      sessionId,
      status: 'CONNECTED',
      ipAddress,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    // Store connection in DynamoDB
    await docClient.send(new PutCommand({
      TableName: CONNECTIONS_TABLE_NAME,
      Item: connection,
    }));

    console.log(`Connection established: ${connectionId} for user: ${userId}`);
    
    // Send welcome message
    const welcomeMessage: WebSocketMessage = {
      type: 'connection_established',
      data: {
        connectionId,
        userId,
        sessionId,
        timestamp: connection.createdAt,
      },
      timestamp: new Date().toISOString(),
    };

    return { statusCode: 200, body: 'Connected' };
    
  } catch (error) {
    console.error('Error in handleConnect:', error);
    return { statusCode: 500, body: 'Connection failed' };
  }
}

async function handleDisconnect(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> {
  const { connectionId } = event.requestContext;

  try {
    // Get connection info before deleting
    const getResult = await docClient.send(new GetCommand({
      TableName: CONNECTIONS_TABLE_NAME,
      Key: { connectionId },
    }));

    if (getResult.Item) {
      const connection = getResult.Item as ConnectionInfo;
      
      // Update connection status to disconnected with timestamp
      await docClient.send(new UpdateCommand({
        TableName: CONNECTIONS_TABLE_NAME,
        Key: { connectionId },
        UpdateExpression: 'SET #status = :status, disconnectedAt = :disconnectedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'DISCONNECTED',
          ':disconnectedAt': new Date().toISOString(),
        },
      }));

      console.log(`Connection closed: ${connectionId} for user: ${connection.userId}`);
      
      // TODO: Clean up any active voice sessions for this connection
      // TODO: Notify other services about disconnection
    } else {
      console.log(`Connection ${connectionId} not found in database`);
    }

    return { statusCode: 200, body: 'Disconnected' };
    
  } catch (error) {
    console.error('Error in handleDisconnect:', error);
    return { statusCode: 500, body: 'Disconnect failed' };
  }
}

async function handleMessage(
  event: APIGatewayProxyWebsocketEventV2,
  apiGatewayClient: ApiGatewayManagementApiClient
): Promise<APIGatewayProxyResultV2> {
  const { connectionId } = event.requestContext;
  
  try {
    const message: WebSocketMessage = event.body ? JSON.parse(event.body) : {};
    
    console.log(`Message received from ${connectionId}:`, message);

    // Update last activity
    await docClient.send(new UpdateCommand({
      TableName: CONNECTIONS_TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: 'SET lastActivity = :lastActivity',
      ExpressionAttributeValues: {
        ':lastActivity': new Date().toISOString(),
      },
    }));

    // Get connection info
    const connectionInfo = await getConnectionInfo(connectionId);
    if (!connectionInfo) {
      throw new Error('Connection not found');
    }

    // Handle different message types
    switch (message.type) {
      case 'voice_start':
        return await handleVoiceStart(connectionId, message as VoiceStartMessage, apiGatewayClient, connectionInfo);
      case 'voice_data':
        return await handleVoiceData(connectionId, message as VoiceDataMessage, apiGatewayClient, connectionInfo);
      case 'voice_end':
        return await handleVoiceEnd(connectionId, message as VoiceEndMessage, apiGatewayClient, connectionInfo);
      case 'text_message':
        return await handleTextMessage(connectionId, message as TextMessage, apiGatewayClient, connectionInfo);
      case 'ping':
        return await handlePing(connectionId, apiGatewayClient);
      default:
        console.log(`Unknown message type: ${message.type}`);
        await sendMessageToConnection(apiGatewayClient, connectionId, {
          type: 'error',
          data: { message: `Unknown message type: ${message.type}` },
          timestamp: new Date().toISOString(),
        });
        return { statusCode: 400, body: 'Unknown message type' };
    }
  } catch (error) {
    console.error('Error in handleMessage:', error);
    
    try {
      await sendMessageToConnection(apiGatewayClient, connectionId, {
        type: 'error',
        data: { message: 'Failed to process message' },
        timestamp: new Date().toISOString(),
      });
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
    
    return { statusCode: 500, body: 'Message processing failed' };
  }
}

async function handleVoiceStart(
  connectionId: string,
  message: VoiceStartMessage,
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionInfo: ConnectionInfo
): Promise<APIGatewayProxyResultV2> {
  try {
    console.log(`Starting voice session for connection: ${connectionId}`);
    
    // Generate a unique session ID if not provided
    const sessionId = message.data?.sessionId || `voice-${Date.now()}-${connectionId}`;
    const audioFormat = message.data?.audioFormat || 'webm';
    
    // TODO: Create voice session in DynamoDB using our data layer
    // TODO: Initialize Nova Sonic session
    
    // Send confirmation back to client
    await sendMessageToConnection(apiGatewayClient, connectionId, {
      type: 'voice_session_started',
      data: {
        sessionId,
        audioFormat,
        status: 'ACTIVE',
      },
      timestamp: new Date().toISOString(),
    });
    
    console.log(`Voice session started: ${sessionId} for connection: ${connectionId}`);
    return { statusCode: 200, body: 'Voice session started' };
    
  } catch (error) {
    console.error('Error starting voice session:', error);
    
    await sendMessageToConnection(apiGatewayClient, connectionId, {
      type: 'voice_session_error',
      data: { message: 'Failed to start voice session' },
      timestamp: new Date().toISOString(),
    });
    
    return { statusCode: 500, body: 'Voice session start failed' };
  }
}

async function handleVoiceData(
  connectionId: string,
  message: VoiceDataMessage,
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionInfo: ConnectionInfo
): Promise<APIGatewayProxyResultV2> {
  try {
    console.log(`Processing voice data for connection: ${connectionId}, session: ${message.data.sessionId}`);
    
    // TODO: Forward audio data to Nova Sonic processor
    // TODO: Process AI response
    // TODO: Store conversation in DynamoDB
    
    // For now, just acknowledge receipt
    await sendMessageToConnection(apiGatewayClient, connectionId, {
      type: 'voice_data_received',
      data: {
        sessionId: message.data.sessionId,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
    
    return { statusCode: 200, body: 'Voice data processed' };
    
  } catch (error) {
    console.error('Error processing voice data:', error);
    
    await sendMessageToConnection(apiGatewayClient, connectionId, {
      type: 'voice_data_error',
      data: { 
        sessionId: message.data.sessionId,
        message: 'Failed to process voice data' 
      },
      timestamp: new Date().toISOString(),
    });
    
    return { statusCode: 500, body: 'Voice data processing failed' };
  }
}

async function handleVoiceEnd(
  connectionId: string,
  message: VoiceEndMessage,
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionInfo: ConnectionInfo
): Promise<APIGatewayProxyResultV2> {
  try {
    console.log(`Ending voice session for connection: ${connectionId}, session: ${message.data.sessionId}`);
    
    // TODO: Finalize Nova Sonic session
    // TODO: Update voice session status in DynamoDB
    // TODO: Generate final AI response if needed
    
    await sendMessageToConnection(apiGatewayClient, connectionId, {
      type: 'voice_session_ended',
      data: {
        sessionId: message.data.sessionId,
        status: 'COMPLETED',
      },
      timestamp: new Date().toISOString(),
    });
    
    console.log(`Voice session ended: ${message.data.sessionId} for connection: ${connectionId}`);
    return { statusCode: 200, body: 'Voice session ended' };
    
  } catch (error) {
    console.error('Error ending voice session:', error);
    
    await sendMessageToConnection(apiGatewayClient, connectionId, {
      type: 'voice_session_error',
      data: { 
        sessionId: message.data.sessionId,
        message: 'Failed to end voice session' 
      },
      timestamp: new Date().toISOString(),
    });
    
    return { statusCode: 500, body: 'Voice session end failed' };
  }
}

async function handleTextMessage(
  connectionId: string,
  message: TextMessage,
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionInfo: ConnectionInfo
): Promise<APIGatewayProxyResultV2> {
  try {
    console.log(`Processing text message for connection: ${connectionId}`);
    
    // TODO: Create chat message in DynamoDB using our data layer
    // TODO: Process with AI service
    // TODO: Generate AI response
    
    // For now, echo the message back
    await sendMessageToConnection(apiGatewayClient, connectionId, {
      type: 'text_message_received',
      data: {
        content: message.data.content,
        sessionId: message.data.sessionId,
        messageId: `msg-${Date.now()}`,
      },
      timestamp: new Date().toISOString(),
    });
    
    // Simulate AI response
    setTimeout(async () => {
      try {
        await sendMessageToConnection(apiGatewayClient, connectionId, {
          type: 'ai_response',
          data: {
            content: `I received your message: "${message.data.content}". This is a placeholder response.`,
            sessionId: message.data.sessionId,
            messageId: `ai-${Date.now()}`,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error sending AI response:', error);
      }
    }, 1000);
    
    return { statusCode: 200, body: 'Text message processed' };
    
  } catch (error) {
    console.error('Error processing text message:', error);
    
    await sendMessageToConnection(apiGatewayClient, connectionId, {
      type: 'text_message_error',
      data: { message: 'Failed to process text message' },
      timestamp: new Date().toISOString(),
    });
    
    return { statusCode: 500, body: 'Text message processing failed' };
  }
}

async function handlePing(
  connectionId: string,
  apiGatewayClient: ApiGatewayManagementApiClient
): Promise<APIGatewayProxyResultV2> {
  try {
    await sendMessageToConnection(apiGatewayClient, connectionId, {
      type: 'pong',
      timestamp: new Date().toISOString(),
    });
    
    return { statusCode: 200, body: 'Pong sent' };
  } catch (error) {
    console.error('Error handling ping:', error);
    return { statusCode: 500, body: 'Ping failed' };
  }
}

// Utility functions
async function getConnectionInfo(connectionId: string): Promise<ConnectionInfo | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: CONNECTIONS_TABLE_NAME,
      Key: { connectionId },
    }));
    
    return result.Item as ConnectionInfo || null;
  } catch (error) {
    console.error('Error getting connection info:', error);
    return null;
  }
}

async function sendMessageToConnection(
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionId: string,
  message: WebSocketMessage
): Promise<void> {
  try {
    await apiGatewayClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    }));
  } catch (error) {
    console.error(`Error sending message to connection ${connectionId}:`, error);
    
    // If connection is stale, remove it from database
    if (error.name === 'GoneException') {
      console.log(`Removing stale connection: ${connectionId}`);
      await docClient.send(new DeleteCommand({
        TableName: CONNECTIONS_TABLE_NAME,
        Key: { connectionId },
      }));
    }
    
    throw error;
  }
}

async function broadcastToUserConnections(
  userId: string,
  message: WebSocketMessage,
  apiGatewayClient: ApiGatewayManagementApiClient
): Promise<void> {
  try {
    // Query all active connections for the user
    const result = await docClient.send(new QueryCommand({
      TableName: CONNECTIONS_TABLE_NAME,
      IndexName: 'UserIdIndex', // Assumes GSI exists
      KeyConditionExpression: 'userId = :userId AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':status': 'CONNECTED',
      },
    }));

    const connections = result.Items as ConnectionInfo[];
    
    // Send message to all user's connections
    const sendPromises = connections.map(connection =>
      sendMessageToConnection(apiGatewayClient, connection.connectionId, message)
        .catch(error => {
          console.error(`Failed to send to connection ${connection.connectionId}:`, error);
        })
    );
    
    await Promise.allSettled(sendPromises);
    
  } catch (error) {
    console.error('Error broadcasting to user connections:', error);
    throw error;
  }
}
// Eve
nt publishing utilities
async function publishEvent(eventType: string, payload: any, userId?: string, sessionId?: string): Promise<void> {
  if (!EVENT_PUBLISHER_FUNCTION_NAME) {
    console.warn('EVENT_PUBLISHER_FUNCTION_NAME not set, skipping event publication');
    return;
  }

  try {
    const event = {
      eventType,
      payload,
      userId,
      sessionId,
    };

    const command = new InvokeCommand({
      FunctionName: EVENT_PUBLISHER_FUNCTION_NAME,
      Payload: JSON.stringify(event),
    });

    await lambdaClient.send(command);
    console.log('Event published successfully:', eventType);
  } catch (error) {
    console.error('Error publishing event:', error);
    // Don't throw error to avoid breaking the main function
  }
}

async function publishVoiceSessionEvent(sessionId: string, status: string, data?: any): Promise<void> {
  await publishEvent('voice_session_event', { status, data }, undefined, sessionId);
}

async function publishChatEvent(userId: string, message: any): Promise<void> {
  await publishEvent('chat_event', { message }, userId);
}

async function publishUIControlEvent(userId: string, action: string, target: string, content?: any): Promise<void> {
  await publishEvent('ui_control_event', { action, target, content }, userId);
}

async function publishNotesEvent(userId: string, noteId: string, action: string, content?: any): Promise<void> {
  await publishEvent('notes_event', { noteId, action, content }, userId);
}