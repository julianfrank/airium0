import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

/**
 * Connection Manager Service
 * Manages WebSocket connections and provides utilities for real-time communication
 * Requirements: 1.1, 6.2
 */

export interface ConnectionInfo {
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

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

export class ConnectionManager {
  private dynamoClient: DynamoDBDocumentClient;
  private connectionsTableName: string;

  constructor(connectionsTableName: string, region: string = 'us-east-1') {
    const client = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.connectionsTableName = connectionsTableName;
  }

  /**
   * Get connection information by connection ID
   */
  async getConnection(connectionId: string): Promise<ConnectionInfo | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: this.connectionsTableName,
        Key: { connectionId },
      }));

      return result.Item as ConnectionInfo || null;
    } catch (error) {
      console.error('Error getting connection:', error);
      throw error;
    }
  }

  /**
   * Get all active connections for a user
   */
  async getUserConnections(userId: string): Promise<ConnectionInfo[]> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.connectionsTableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId AND #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':status': 'CONNECTED',
        },
      }));

      return result.Items as ConnectionInfo[] || [];
    } catch (error) {
      console.error('Error getting user connections:', error);
      throw error;
    }
  }

  /**
   * Update connection's last activity
   */
  async updateLastActivity(connectionId: string): Promise<void> {
    try {
      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.connectionsTableName,
        Key: { connectionId },
        UpdateExpression: 'SET lastActivity = :lastActivity',
        ExpressionAttributeValues: {
          ':lastActivity': new Date().toISOString(),
        },
      }));
    } catch (error) {
      console.error('Error updating last activity:', error);
      throw error;
    }
  }

  /**
   * Mark connection as disconnected
   */
  async markDisconnected(connectionId: string): Promise<void> {
    try {
      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.connectionsTableName,
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
    } catch (error) {
      console.error('Error marking connection as disconnected:', error);
      throw error;
    }
  }

  /**
   * Remove stale connection from database
   */
  async removeConnection(connectionId: string): Promise<void> {
    try {
      await this.dynamoClient.send(new DeleteCommand({
        TableName: this.connectionsTableName,
        Key: { connectionId },
      }));
    } catch (error) {
      console.error('Error removing connection:', error);
      throw error;
    }
  }

  /**
   * Send message to a specific connection
   */
  async sendMessage(
    apiGatewayEndpoint: string,
    connectionId: string,
    message: WebSocketMessage
  ): Promise<void> {
    const apiGatewayClient = new ApiGatewayManagementApiClient({
      endpoint: apiGatewayEndpoint,
    });

    try {
      await apiGatewayClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(message),
      }));
    } catch (error) {
      console.error(`Error sending message to connection ${connectionId}:`, error);
      
      // If connection is stale, remove it from database
      if (error && typeof error === 'object' && 'name' in error && error.name === 'GoneException') {
        console.log(`Removing stale connection: ${connectionId}`);
        await this.removeConnection(connectionId);
      }
      
      throw error;
    }
  }

  /**
   * Broadcast message to all connections of a user
   */
  async broadcastToUser(
    apiGatewayEndpoint: string,
    userId: string,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const connections = await this.getUserConnections(userId);
      
      const sendPromises = connections.map(connection =>
        this.sendMessage(apiGatewayEndpoint, connection.connectionId, message)
          .catch(error => {
            console.error(`Failed to send to connection ${connection.connectionId}:`, error);
          })
      );
      
      await Promise.allSettled(sendPromises);
      
    } catch (error) {
      console.error('Error broadcasting to user:', error);
      throw error;
    }
  }

  /**
   * Broadcast message to multiple users
   */
  async broadcastToUsers(
    apiGatewayEndpoint: string,
    userIds: string[],
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const broadcastPromises = userIds.map(userId =>
        this.broadcastToUser(apiGatewayEndpoint, userId, message)
          .catch(error => {
            console.error(`Failed to broadcast to user ${userId}:`, error);
          })
      );
      
      await Promise.allSettled(broadcastPromises);
      
    } catch (error) {
      console.error('Error broadcasting to users:', error);
      throw error;
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    uniqueUsers: number;
  }> {
    try {
      // This is a simplified implementation
      // In production, you might want to use DynamoDB Streams or CloudWatch metrics
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.connectionsTableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'CONNECTED',
        },
      }));

      const connections = result.Items as ConnectionInfo[] || [];
      const uniqueUsers = new Set(connections.map(conn => conn.userId)).size;

      return {
        totalConnections: connections.length,
        activeConnections: connections.length,
        uniqueUsers,
      };
    } catch (error) {
      console.error('Error getting connection stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old disconnected connections
   */
  async cleanupOldConnections(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
      
      // This is a simplified implementation
      // In production, you might want to use DynamoDB TTL or a scheduled cleanup job
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.connectionsTableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: '#status = :status',
        FilterExpression: 'disconnectedAt < :cutoffTime',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'DISCONNECTED',
          ':cutoffTime': cutoffTime,
        },
      }));

      const oldConnections = result.Items as ConnectionInfo[] || [];
      
      // Delete old connections
      const deletePromises = oldConnections.map(connection =>
        this.removeConnection(connection.connectionId)
          .catch(error => {
            console.error(`Failed to delete connection ${connection.connectionId}:`, error);
          })
      );
      
      await Promise.allSettled(deletePromises);
      
      return oldConnections.length;
    } catch (error) {
      console.error('Error cleaning up old connections:', error);
      throw error;
    }
  }
}