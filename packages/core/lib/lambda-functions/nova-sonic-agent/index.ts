import { Handler, APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const WEBSOCKET_API_ID = process.env.WEBSOCKET_API_ID!;
const NOVA_SONIC_PROCESSOR_ARN = process.env.NOVA_SONIC_PROCESSOR_ARN!;
const region = process.env.AWS_REGION || 'us-east-1';

const apiGatewayClient = new ApiGatewayManagementApiClient({
  endpoint: `https://${WEBSOCKET_API_ID}.execute-api.${region}.amazonaws.com/prod`,
});

const lambdaClient = new LambdaClient({ region });

interface WebSocketMessage {
  action: 'voice_session_start' | 'voice_data' | 'voice_chunk' | 'voice_session_end' | 'ping' | string;
  sessionId?: string;
  userId?: string;
  data?: {
    audioData?: string;
    audioFormat?: string;
    streaming?: boolean;
    language?: string;
    model?: string;
    sequenceNumber?: number;
  };
}

/**
 * Nova Sonic Agent - Main entry point for voice interactions
 * This function acts as a coordinator between WebSocket connections and Nova Sonic processing
 * Following the aws-samples/sample-serverless-nova-sonic-chat pattern
 */
export const handler: Handler<APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2> = async (event) => {
  console.log('Nova Sonic Agent event:', JSON.stringify(event, null, 2));

  const { connectionId, routeKey } = event.requestContext;
  
  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(connectionId);
      case '$disconnect':
        return await handleDisconnect(connectionId);
      case '$default':
        return await handleMessage(event);
      default:
        console.log(`Unknown route: ${routeKey}`);
        return { statusCode: 400 };
    }
  } catch (error) {
    console.error('Error in Nova Sonic Agent:', error);
    
    // Send error to client if possible
    try {
      await sendToConnection(connectionId, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } catch (sendError) {
      console.error('Failed to send error to client:', sendError);
    }
    
    return { statusCode: 500 };
  }
};

async function handleConnect(connectionId: string): Promise<APIGatewayProxyResultV2> {
  console.log(`Nova Sonic Agent: Connection established: ${connectionId}`);
  
  // Send welcome message
  await sendToConnection(connectionId, {
    type: 'connection_established',
    connectionId,
    capabilities: {
      voice: true,
      streaming: true,
      models: ['nova-sonic', 'claude-3-haiku', 'claude-3-sonnet'],
    },
    timestamp: new Date().toISOString(),
  });
  
  return { statusCode: 200 };
}

async function handleDisconnect(connectionId: string): Promise<APIGatewayProxyResultV2> {
  console.log(`Nova Sonic Agent: Connection closed: ${connectionId}`);
  
  // TODO: Clean up any active voice sessions for this connection
  // This would involve calling the session manager to end any active sessions
  
  return { statusCode: 200 };
}

async function handleMessage(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> {
  const { connectionId } = event.requestContext;
  
  if (!event.body) {
    console.log('No message body received');
    return { statusCode: 400 };
  }

  try {
    const message: WebSocketMessage = JSON.parse(event.body);
    console.log(`Nova Sonic Agent: Received message:`, { action: message.action, sessionId: message.sessionId });

    switch (message.action) {
      case 'voice_session_start':
        return await handleVoiceSessionStart(connectionId, message);
      case 'voice_data':
        return await handleVoiceData(connectionId, message);
      case 'voice_chunk':
        return await handleVoiceChunk(connectionId, message);
      case 'voice_session_end':
        return await handleVoiceSessionEnd(connectionId, message);
      case 'ping':
        return await handlePing(connectionId);
      default:
        console.log(`Unknown action: ${message.action}`);
        await sendToConnection(connectionId, {
          type: 'error',
          error: `Unknown action: ${message.action}`,
          timestamp: new Date().toISOString(),
        });
        return { statusCode: 400 };
    }
  } catch (error) {
    console.error('Error parsing message:', error);
    return { statusCode: 400 };
  }
}

async function handleVoiceSessionStart(
  connectionId: string, 
  message: WebSocketMessage
): Promise<APIGatewayProxyResultV2> {
  console.log(`Starting voice session for connection: ${connectionId}`);
  
  try {
    const sessionId = message.sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const userId = message.userId || 'anonymous';
    
    // Invoke Nova Sonic Processor to initialize session
    await invokeLambda(NOVA_SONIC_PROCESSOR_ARN, {
      connectionId,
      sessionId,
      userId,
      messageType: 'voice_session_start',
      audioFormat: message.data?.audioFormat || 'webm',
      processingOptions: {
        streaming: message.data?.streaming !== false,
        language: message.data?.language || 'en-US',
        model: message.data?.model || 'claude-3-haiku',
      },
    });
    
    return { statusCode: 200 };
  } catch (error) {
    console.error('Error starting voice session:', error);
    throw error;
  }
}

async function handleVoiceData(
  connectionId: string, 
  message: WebSocketMessage
): Promise<APIGatewayProxyResultV2> {
  console.log(`Processing complete voice data for session: ${message.sessionId}`);
  
  try {
    if (!message.sessionId) {
      throw new Error('Session ID is required for voice data processing');
    }
    
    if (!message.data?.audioData) {
      throw new Error('Audio data is required');
    }
    
    // Invoke Nova Sonic Processor to handle complete voice data
    await invokeLambda(NOVA_SONIC_PROCESSOR_ARN, {
      connectionId,
      sessionId: message.sessionId,
      userId: message.userId || 'anonymous',
      messageType: 'voice_data_process',
      audioData: message.data.audioData,
      audioFormat: message.data.audioFormat || 'webm',
      processingOptions: {
        streaming: message.data.streaming !== false,
        language: message.data.language || 'en-US',
        model: message.data.model || 'claude-3-haiku',
      },
    });
    
    return { statusCode: 200 };
  } catch (error) {
    console.error('Error processing voice data:', error);
    throw error;
  }
}

async function handleVoiceChunk(
  connectionId: string, 
  message: WebSocketMessage
): Promise<APIGatewayProxyResultV2> {
  console.log(`Processing voice chunk for session: ${message.sessionId}`);
  
  try {
    if (!message.sessionId) {
      throw new Error('Session ID is required for voice chunk processing');
    }
    
    if (!message.data?.audioData) {
      throw new Error('Audio data is required for chunk processing');
    }
    
    // Invoke Nova Sonic Processor to handle voice chunk
    await invokeLambda(NOVA_SONIC_PROCESSOR_ARN, {
      connectionId,
      sessionId: message.sessionId,
      userId: message.userId || 'anonymous',
      messageType: 'voice_chunk_process',
      audioData: message.data.audioData,
      sequenceNumber: message.data.sequenceNumber || 0,
      audioFormat: message.data.audioFormat || 'webm',
      processingOptions: {
        streaming: message.data.streaming !== false,
        language: message.data.language || 'en-US',
        model: message.data.model || 'claude-3-haiku',
      },
    });
    
    return { statusCode: 200 };
  } catch (error) {
    console.error('Error processing voice chunk:', error);
    throw error;
  }
}

async function handleVoiceSessionEnd(
  connectionId: string, 
  message: WebSocketMessage
): Promise<APIGatewayProxyResultV2> {
  console.log(`Ending voice session: ${message.sessionId}`);
  
  try {
    if (!message.sessionId) {
      throw new Error('Session ID is required to end voice session');
    }
    
    // Invoke Nova Sonic Processor to end session
    await invokeLambda(NOVA_SONIC_PROCESSOR_ARN, {
      connectionId,
      sessionId: message.sessionId,
      userId: message.userId || 'anonymous',
      messageType: 'voice_session_end',
    });
    
    return { statusCode: 200 };
  } catch (error) {
    console.error('Error ending voice session:', error);
    throw error;
  }
}

async function handlePing(connectionId: string): Promise<APIGatewayProxyResultV2> {
  await sendToConnection(connectionId, {
    type: 'pong',
    timestamp: new Date().toISOString(),
  });
  
  return { statusCode: 200 };
}

async function invokeLambda(functionArn: string, payload: any): Promise<any> {
  try {
    const command = new InvokeCommand({
      FunctionName: functionArn,
      Payload: JSON.stringify(payload),
      InvocationType: 'Event', // Async invocation for better performance
    });

    const response = await lambdaClient.send(command);
    console.log(`Lambda invoked successfully: ${functionArn}`);
    
    return response;
  } catch (error) {
    console.error(`Error invoking Lambda ${functionArn}:`, error);
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