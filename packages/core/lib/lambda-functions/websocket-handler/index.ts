import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { createLambdaLogger, withLogging, withTiming } from '../shared/logger';
import { 
  withErrorHandling, 
  ValidationError, 
  NotFoundError, 
  ExternalServiceError,
  TimeoutError,
  validateRequired,
  validateString 
} from '../shared/error-handler';

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

export const handler = withErrorHandling(
  withLogging(async (
    event: APIGatewayProxyWebsocketEventV2
  ): Promise<APIGatewayProxyResultV2> => {
    const logger = createLambdaLogger('websocket-handler', event);
    const { routeKey, connectionId, domainName, stage } = event.requestContext;
    
    logger.info('WebSocket event received', {
      routeKey,
      connectionId,
      domainName,
      stage,
    });

    // Validate required fields
    validateRequired(event.requestContext, ['routeKey', 'connectionId', 'domainName', 'stage']);

    // Initialize API Gateway Management API client for sending messages back to clients
    const apiGatewayClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${domainName}/${stage}`,
    });

    try {
      switch (routeKey) {
        case '$connect':
          return await withTiming(
            () => handleConnect(event, logger),
            'handleConnect',
            logger
          )();
        case '$disconnect':
          return await withTiming(
            () => handleDisconnect(event, logger),
            'handleDisconnect',
            logger
          )();
        case '$default':
          return await withTiming(
            () => handleMessage(event, apiGatewayClient, logger),
            'handleMessage',
            logger
          )();
        default:
          logger.warn('Unknown route received', { routeKey });
          return { statusCode: 400, body: 'Unknown route' };
      }
    } catch (error) {
      logger.error('Error handling WebSocket event', { routeKey, connectionId }, error as Error);
      
      // Try to send error message back to client
      try {
        await sendMessageToConnection(apiGatewayClient, connectionId, {
          type: 'error',
          data: { message: 'Internal server error' },
          timestamp: new Date().toISOString(),
        }, logger);
      } catch (sendError) {
        logger.error('Failed to send error message to client', { connectionId }, sendError as Error);
      }
      
      throw error; // Re-throw to be handled by error handler wrapper
    }
  }, 'websocket-handler')
);

async function handleConnect(event: APIGatewayProxyWebsocketEventV2, logger: any): Promise<APIGatewayProxyResultV2> {
  const { connectionId } = event.requestContext;
  
  try {
    // Extract user information from query parameters or headers
    const userId = event.queryStringParameters?.userId || 'anonymous';
    const sessionId = event.queryStringParameters?.sessionId;
    
    // Validate userId if provided
    if (userId !== 'anonymous') {
      validateString(userId, 'userId', 1, 256);
    }
    
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

    logger.info('Storing connection in DynamoDB', {
      connectionId,
      userId,
      sessionId,
      ipAddress,
    });

    // Store connection in DynamoDB with retry logic
    try {
      await docClient.send(new PutCommand({
        TableName: CONNECTIONS_TABLE_NAME,
        Item: connection,
      }));
    } catch (dbError) {
      logger.error('Failed to store connection in DynamoDB', { connectionId, userId }, dbError as Error);
      throw new ExternalServiceError('Failed to store connection', 'DynamoDB');
    }

    logger.info('Connection established successfully', {
      connectionId,
      userId,
      sessionId,
    });
    
    return { statusCode: 200, body: 'Connected' };
    
  } catch (error) {
    logger.error('Error in handleConnect', { connectionId }, error as Error);
    throw error; // Re-throw to be handled by wrapper
  }
}

async function handleDisconnect(event: APIGatewayProxyWebsocketEventV2, logger: any): Promise<APIGatewayProxyResultV2> {
  const { connectionId } = event.requestContext;

  try {
    logger.info('Processing disconnect request', { connectionId });

    // Get connection info before updating
    let connection: ConnectionInfo | null = null;
    try {
      const getResult = await docClient.send(new GetCommand({
        TableName: CONNECTIONS_TABLE_NAME,
        Key: { connectionId },
      }));
      connection = getResult.Item as ConnectionInfo || null;
    } catch (dbError) {
      logger.error('Failed to retrieve connection info', { connectionId }, dbError as Error);
      throw new ExternalServiceError('Failed to retrieve connection info', 'DynamoDB');
    }

    if (connection) {
      logger.info('Connection found, updating status', {
        connectionId,
        userId: connection.userId,
        sessionId: connection.sessionId,
      });
      
      // Update connection status to disconnected with timestamp
      try {
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
      } catch (dbError) {
        logger.error('Failed to update connection status', { connectionId }, dbError as Error);
        throw new ExternalServiceError('Failed to update connection status', 'DynamoDB');
      }

      logger.info('Connection disconnected successfully', {
        connectionId,
        userId: connection.userId,
        sessionId: connection.sessionId,
      });
      
      // TODO: Clean up any active voice sessions for this connection
      // TODO: Notify other services about disconnection
      
      // Publish disconnection event
      try {
        await publishEvent('connection_disconnected', {
          connectionId,
          userId: connection.userId,
          sessionId: connection.sessionId,
        }, connection.userId);
      } catch (eventError) {
        logger.warn('Failed to publish disconnection event', { connectionId }, eventError as Error);
        // Don't fail the disconnect for event publishing errors
      }
      
    } else {
      logger.warn('Connection not found in database', { connectionId });
    }

    return { statusCode: 200, body: 'Disconnected' };
    
  } catch (error) {
    logger.error('Error in handleDisconnect', { connectionId }, error as Error);
    throw error; // Re-throw to be handled by wrapper
  }
}

async function handleMessage(
  event: APIGatewayProxyWebsocketEventV2,
  apiGatewayClient: ApiGatewayManagementApiClient,
  logger: any
): Promise<APIGatewayProxyResultV2> {
  const { connectionId } = event.requestContext;
  
  try {
    // Parse and validate message
    let message: WebSocketMessage;
    try {
      message = event.body ? JSON.parse(event.body) : {};
    } catch (parseError) {
      logger.error('Failed to parse message body', { connectionId }, parseError as Error);
      throw new ValidationError('Invalid JSON in message body');
    }
    
    // Validate message structure
    validateRequired(message, ['type']);
    validateString(message.type, 'type', 1, 50);
    
    logger.info('Message received', {
      connectionId,
      messageType: message.type,
      hasData: !!message.data,
    });

    // Update last activity with error handling
    try {
      await docClient.send(new UpdateCommand({
        TableName: CONNECTIONS_TABLE_NAME,
        Key: { connectionId },
        UpdateExpression: 'SET lastActivity = :lastActivity',
        ExpressionAttributeValues: {
          ':lastActivity': new Date().toISOString(),
        },
      }));
    } catch (dbError) {
      logger.warn('Failed to update last activity', { connectionId }, dbError as Error);
      // Don't fail the message processing for this
    }

    // Get connection info
    const connectionInfo = await getConnectionInfo(connectionId, logger);
    if (!connectionInfo) {
      throw new NotFoundError('Connection not found');
    }

    // Handle different message types with individual error handling
    try {
      switch (message.type) {
        case 'voice_start':
          return await handleVoiceStart(connectionId, message as VoiceStartMessage, apiGatewayClient, connectionInfo, logger);
        case 'voice_data':
          return await handleVoiceData(connectionId, message as VoiceDataMessage, apiGatewayClient, connectionInfo, logger);
        case 'voice_end':
          return await handleVoiceEnd(connectionId, message as VoiceEndMessage, apiGatewayClient, connectionInfo, logger);
        case 'text_message':
          return await handleTextMessage(connectionId, message as TextMessage, apiGatewayClient, connectionInfo, logger);
        case 'ping':
          return await handlePing(connectionId, apiGatewayClient, logger);
        default:
          logger.warn('Unknown message type received', { connectionId, messageType: message.type });
          
          await sendMessageToConnection(apiGatewayClient, connectionId, {
            type: 'error',
            data: { message: `Unknown message type: ${message.type}` },
            timestamp: new Date().toISOString(),
          }, logger);
          
          throw new ValidationError(`Unknown message type: ${message.type}`);
      }
    } catch (handlerError) {
      logger.error('Message handler failed', {
        connectionId,
        messageType: message.type,
      }, handlerError as Error);
      
      // Send specific error message to client
      try {
        await sendMessageToConnection(apiGatewayClient, connectionId, {
          type: 'error',
          data: { 
            message: 'Failed to process message',
            messageType: message.type,
            errorCode: (handlerError as any).name || 'PROCESSING_ERROR'
          },
          timestamp: new Date().toISOString(),
        }, logger);
      } catch (sendError) {
        logger.error('Failed to send error message to client', { connectionId }, sendError as Error);
      }
      
      throw handlerError;
    }
    
  } catch (error) {
    logger.error('Error in handleMessage', { connectionId }, error as Error);
    throw error; // Re-throw to be handled by wrapper
  }
}

async function handleVoiceStart(
  connectionId: string,
  message: VoiceStartMessage,
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionInfo: ConnectionInfo,
  logger: any
): Promise<APIGatewayProxyResultV2> {
  try {
    logger.info('Starting voice session', {
      connectionId,
      userId: connectionInfo.userId,
      requestedSessionId: message.data?.sessionId,
      audioFormat: message.data?.audioFormat,
    });
    
    // Validate voice start data
    if (message.data?.audioFormat) {
      validateString(message.data.audioFormat, 'audioFormat', 1, 20);
    }
    
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
    }, logger);
    
    logger.info('Voice session started successfully', {
      connectionId,
      userId: connectionInfo.userId,
      sessionId,
      audioFormat,
    });
    
    return { statusCode: 200, body: 'Voice session started' };
    
  } catch (error) {
    logger.error('Error starting voice session', {
      connectionId,
      userId: connectionInfo.userId,
    }, error as Error);
    
    try {
      await sendMessageToConnection(apiGatewayClient, connectionId, {
        type: 'voice_session_error',
        data: { message: 'Failed to start voice session' },
        timestamp: new Date().toISOString(),
      }, logger);
    } catch (sendError) {
      logger.error('Failed to send voice session error message', { connectionId }, sendError as Error);
    }
    
    throw error; // Re-throw to be handled by wrapper
  }
}

async function handleVoiceData(
  connectionId: string,
  message: VoiceDataMessage,
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionInfo: ConnectionInfo,
  logger: any
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
  connectionInfo: ConnectionInfo,
  logger: any
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
  connectionInfo: ConnectionInfo,
  logger: any
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
  apiGatewayClient: ApiGatewayManagementApiClient,
  logger: any
): Promise<APIGatewayProxyResultV2> {
  try {
    logger.debug('Processing ping request', { connectionId });
    
    await sendMessageToConnection(apiGatewayClient, connectionId, {
      type: 'pong',
      timestamp: new Date().toISOString(),
    }, logger);
    
    logger.debug('Pong sent successfully', { connectionId });
    return { statusCode: 200, body: 'Pong sent' };
  } catch (error) {
    logger.error('Error handling ping', { connectionId }, error as Error);
    throw error; // Re-throw to be handled by wrapper
  }
}

// Utility functions
async function getConnectionInfo(connectionId: string, logger?: any): Promise<ConnectionInfo | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: CONNECTIONS_TABLE_NAME,
      Key: { connectionId },
    }));
    
    const connection = result.Item as ConnectionInfo || null;
    
    if (connection) {
      logger?.debug('Connection info retrieved', {
        connectionId,
        userId: connection.userId,
        status: connection.status,
      });
    } else {
      logger?.warn('Connection not found', { connectionId });
    }
    
    return connection;
  } catch (error) {
    logger?.error('Error getting connection info', { connectionId }, error as Error);
    throw new ExternalServiceError('Failed to retrieve connection info', 'DynamoDB');
  }
}

async function sendMessageToConnection(
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionId: string,
  message: WebSocketMessage,
  logger?: any
): Promise<void> {
  try {
    const startTime = Date.now();
    
    await apiGatewayClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    }));
    
    const duration = Date.now() - startTime;
    logger?.debug('Message sent successfully', {
      connectionId,
      messageType: message.type,
      duration,
    });
    
  } catch (error) {
    const apiError = error as any;
    logger?.error('Error sending message to connection', {
      connectionId,
      messageType: message.type,
      errorName: apiError.name,
    }, apiError);
    
    // If connection is stale, remove it from database
    if (apiError.name === 'GoneException') {
      logger?.info('Removing stale connection', { connectionId });
      
      try {
        await docClient.send(new DeleteCommand({
          TableName: CONNECTIONS_TABLE_NAME,
          Key: { connectionId },
        }));
        
        logger?.info('Stale connection removed successfully', { connectionId });
      } catch (dbError) {
        logger?.error('Failed to remove stale connection', { connectionId }, dbError as Error);
      }
    }
    
    throw new ExternalServiceError(
      `Failed to send message to connection: ${apiError.message}`,
      'ApiGatewayManagementApi'
    );
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