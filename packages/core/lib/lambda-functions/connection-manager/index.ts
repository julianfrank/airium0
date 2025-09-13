import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE_NAME = process.env.CONNECTIONS_TABLE_NAME!;

export const handler: Handler = async (event) => {
  console.log('Connection manager event:', JSON.stringify(event, null, 2));

  try {
    const { action, connectionId, userId } = event;

    switch (action) {
      case 'get_user_connections':
        return await getUserConnections(userId);
      case 'get_all_connections':
        return await getAllConnections();
      case 'update_connection_status':
        return await updateConnectionStatus(connectionId, event.status);
      case 'cleanup_stale_connections':
        return await cleanupStaleConnections();
      default:
        console.log(`Unknown action: ${action}`);
        return { statusCode: 400, body: 'Unknown action' };
    }
  } catch (error) {
    console.error('Error in connection manager:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

async function getUserConnections(userId: string) {
  console.log(`Getting connections for user: ${userId}`);
  
  const command = new ScanCommand({
    TableName: CONNECTIONS_TABLE_NAME,
    FilterExpression: 'userId = :userId AND #status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':userId': userId,
      ':status': 'CONNECTED',
    },
  });

  const result = await docClient.send(command);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      connections: result.Items || [],
      count: result.Count || 0,
    }),
  };
}

async function getAllConnections() {
  console.log('Getting all active connections');
  
  const command = new ScanCommand({
    TableName: CONNECTIONS_TABLE_NAME,
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': 'CONNECTED',
    },
  });

  const result = await docClient.send(command);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      connections: result.Items || [],
      count: result.Count || 0,
    }),
  };
}

async function updateConnectionStatus(connectionId: string, status: string) {
  console.log(`Updating connection ${connectionId} status to: ${status}`);
  
  const command = new UpdateCommand({
    TableName: CONNECTIONS_TABLE_NAME,
    Key: { connectionId },
    UpdateExpression: 'SET #status = :status, lastActivity = :lastActivity',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':lastActivity': new Date().toISOString(),
    },
  });

  await docClient.send(command);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Connection status updated' }),
  };
}

async function cleanupStaleConnections() {
  console.log('Cleaning up stale connections');
  
  // Find connections that haven't been active for more than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const scanCommand = new ScanCommand({
    TableName: CONNECTIONS_TABLE_NAME,
    FilterExpression: 'lastActivity < :oneHourAgo',
    ExpressionAttributeValues: {
      ':oneHourAgo': oneHourAgo,
    },
  });

  const result = await docClient.send(scanCommand);
  const staleConnections = result.Items || [];
  
  // Update stale connections to DISCONNECTED status
  const updatePromises = staleConnections.map(connection => {
    const updateCommand = new UpdateCommand({
      TableName: CONNECTIONS_TABLE_NAME,
      Key: { connectionId: connection.connectionId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'DISCONNECTED',
      },
    });
    
    return docClient.send(updateCommand);
  });

  await Promise.all(updatePromises);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Stale connections cleaned up',
      cleanedCount: staleConnections.length,
    }),
  };
}