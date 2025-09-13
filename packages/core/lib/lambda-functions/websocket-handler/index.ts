import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE_NAME = process.env.CONNECTIONS_TABLE_NAME!;

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, connectionId } = event.requestContext;
  
  console.log(`Route: ${routeKey}, ConnectionId: ${connectionId}`);

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(event);
      case '$disconnect':
        return await handleDisconnect(event);
      case '$default':
        return await handleMessage(event);
      default:
        return { statusCode: 400, body: 'Unknown route' };
    }
  } catch (error) {
    console.error('Error handling WebSocket event:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

async function handleConnect(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> {
  const { connectionId } = event.requestContext;
  
  // Extract user information from query parameters or headers
  const userId = event.queryStringParameters?.userId || 'anonymous';
  
  const connection = {
    connectionId,
    userId,
    status: 'CONNECTED',
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: CONNECTIONS_TABLE_NAME,
    Item: connection,
  }));

  console.log(`Connection established: ${connectionId} for user: ${userId}`);
  return { statusCode: 200, body: 'Connected' };
}

async function handleDisconnect(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> {
  const { connectionId } = event.requestContext;

  await docClient.send(new DeleteCommand({
    TableName: CONNECTIONS_TABLE_NAME,
    Key: { connectionId },
  }));

  console.log(`Connection closed: ${connectionId}`);
  return { statusCode: 200, body: 'Disconnected' };
}

async function handleMessage(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> {
  const { connectionId } = event.requestContext;
  const body = event.body ? JSON.parse(event.body) : {};

  console.log(`Message received from ${connectionId}:`, body);

  // Update last activity
  await docClient.send(new PutCommand({
    TableName: CONNECTIONS_TABLE_NAME,
    Item: {
      connectionId,
      lastActivity: new Date().toISOString(),
    },
  }));

  // Handle different message types
  switch (body.type) {
    case 'voice_start':
      return await handleVoiceStart(connectionId, body);
    case 'voice_data':
      return await handleVoiceData(connectionId, body);
    case 'voice_end':
      return await handleVoiceEnd(connectionId, body);
    case 'text_message':
      return await handleTextMessage(connectionId, body);
    default:
      console.log(`Unknown message type: ${body.type}`);
      return { statusCode: 400, body: 'Unknown message type' };
  }
}

async function handleVoiceStart(connectionId: string, body: any): Promise<APIGatewayProxyResultV2> {
  // Initialize voice session
  console.log(`Starting voice session for connection: ${connectionId}`);
  // TODO: Integrate with Nova Sonic service
  return { statusCode: 200, body: 'Voice session started' };
}

async function handleVoiceData(connectionId: string, body: any): Promise<APIGatewayProxyResultV2> {
  // Process voice data
  console.log(`Processing voice data for connection: ${connectionId}`);
  // TODO: Forward to Nova Sonic processor
  return { statusCode: 200, body: 'Voice data processed' };
}

async function handleVoiceEnd(connectionId: string, body: any): Promise<APIGatewayProxyResultV2> {
  // End voice session
  console.log(`Ending voice session for connection: ${connectionId}`);
  // TODO: Clean up Nova Sonic session
  return { statusCode: 200, body: 'Voice session ended' };
}

async function handleTextMessage(connectionId: string, body: any): Promise<APIGatewayProxyResultV2> {
  // Process text message
  console.log(`Processing text message for connection: ${connectionId}`);
  // TODO: Forward to AI processing service
  return { statusCode: 200, body: 'Text message processed' };
}