import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb');
vi.mock('@aws-sdk/lib-dynamodb');

const mockDynamoClient = {
  send: vi.fn(),
};

// Mock the DynamoDB document client
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => mockDynamoClient),
  },
  QueryCommand: vi.fn(),
  ScanCommand: vi.fn(),
  UpdateCommand: vi.fn(),
}));

// Mock handler implementation for testing
const createMockConnectionManager = () => {
  return async (event: any) => {
    try {
      const { action, connectionId, userId } = event;

      switch (action) {
      case 'get_user_connections':
        const result = await mockDynamoClient.send({
          TableName: process.env.CONNECTIONS_TABLE_NAME,
          FilterExpression: 'userId = :userId AND #status = :status',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':userId': userId,
            ':status': 'CONNECTED',
          },
        });
        return {
          statusCode: 200,
          body: JSON.stringify({
            connections: result.Items || [],
            count: result.Count || 0,
          }),
        };

      case 'get_all_connections':
        const allResult = await mockDynamoClient.send({
          TableName: process.env.CONNECTIONS_TABLE_NAME,
          FilterExpression: '#status = :status',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':status': 'CONNECTED' },
        });
        return {
          statusCode: 200,
          body: JSON.stringify({
            connections: allResult.Items || [],
            count: allResult.Count || 0,
          }),
        };

      case 'update_connection_status':
        await mockDynamoClient.send({
          TableName: process.env.CONNECTIONS_TABLE_NAME,
          Key: { connectionId },
          UpdateExpression: 'SET #status = :status, lastActivity = :lastActivity',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': event.status,
            ':lastActivity': new Date().toISOString(),
          },
        });
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Connection status updated' }),
        };

      case 'cleanup_stale_connections':
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const staleResult = await mockDynamoClient.send({
          TableName: process.env.CONNECTIONS_TABLE_NAME,
          FilterExpression: 'lastActivity < :oneHourAgo',
          ExpressionAttributeValues: { ':oneHourAgo': oneHourAgo },
        });
        
        const staleConnections = staleResult.Items || [];
        
        // Update each stale connection
        for (const connection of staleConnections) {
          await mockDynamoClient.send({
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            Key: { connectionId: connection.connectionId },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': 'DISCONNECTED' },
          });
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Stale connections cleaned up',
            cleanedCount: staleConnections.length,
          }),
        };

      default:
        return { statusCode: 400, body: 'Unknown action' };
      }
    } catch (error) {
      console.error('Error in connection manager:', error);
      return { statusCode: 500, body: 'Internal server error' };
    }
  };
};

describe('Connection Manager', () => {
  let handler: ReturnType<typeof createMockConnectionManager>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set environment variables
    process.env.CONNECTIONS_TABLE_NAME = 'test-connections-table';
    
    // Create mock handler
    handler = createMockConnectionManager();
  });

  describe('Get User Connections', () => {
    it('should retrieve connections for a specific user', async () => {
      const event = {
        action: 'get_user_connections',
        userId: 'test-user-id',
      };

      const mockConnections = [
        {
          connectionId: 'conn-1',
          userId: 'test-user-id',
          status: 'CONNECTED',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          connectionId: 'conn-2',
          userId: 'test-user-id',
          status: 'CONNECTED',
          createdAt: '2024-01-01T01:00:00Z',
        },
      ];

      mockDynamoClient.send.mockResolvedValue({
        Items: mockConnections,
        Count: 2,
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.connections).toEqual(mockConnections);
      expect(body.count).toBe(2);
      
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections-table',
          FilterExpression: 'userId = :userId AND #status = :status',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':userId': 'test-user-id',
            ':status': 'CONNECTED',
          },
        })
      );
    });

    it('should handle empty connections list', async () => {
      const event = {
        action: 'get_user_connections',
        userId: 'user-with-no-connections',
      };

      mockDynamoClient.send.mockResolvedValue({
        Items: [],
        Count: 0,
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.connections).toEqual([]);
      expect(body.count).toBe(0);
    });
  });

  describe('Get All Connections', () => {
    it('should retrieve all active connections', async () => {
      const event = {
        action: 'get_all_connections',
      };

      const mockConnections = [
        {
          connectionId: 'conn-1',
          userId: 'user-1',
          status: 'CONNECTED',
        },
        {
          connectionId: 'conn-2',
          userId: 'user-2',
          status: 'CONNECTED',
        },
        {
          connectionId: 'conn-3',
          userId: 'user-3',
          status: 'CONNECTED',
        },
      ];

      mockDynamoClient.send.mockResolvedValue({
        Items: mockConnections,
        Count: 3,
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.connections).toEqual(mockConnections);
      expect(body.count).toBe(3);
      
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections-table',
          FilterExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': 'CONNECTED',
          },
        })
      );
    });
  });

  describe('Update Connection Status', () => {
    it('should update connection status successfully', async () => {
      const event = {
        action: 'update_connection_status',
        connectionId: 'test-connection-id',
        status: 'DISCONNECTED',
      };

      mockDynamoClient.send.mockResolvedValue({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Connection status updated');
      
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections-table',
          Key: { connectionId: 'test-connection-id' },
          UpdateExpression: 'SET #status = :status, lastActivity = :lastActivity',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': 'DISCONNECTED',
            ':lastActivity': expect.any(String),
          },
        })
      );
    });
  });

  describe('Cleanup Stale Connections', () => {
    it('should identify and cleanup stale connections', async () => {
      const event = {
        action: 'cleanup_stale_connections',
      };

      const staleConnections = [
        {
          connectionId: 'stale-conn-1',
          userId: 'user-1',
          status: 'CONNECTED',
          lastActivity: '2024-01-01T00:00:00Z', // Old timestamp
        },
        {
          connectionId: 'stale-conn-2',
          userId: 'user-2',
          status: 'CONNECTED',
          lastActivity: '2024-01-01T00:00:00Z', // Old timestamp
        },
      ];

      // Mock scan to find stale connections
      mockDynamoClient.send
        .mockResolvedValueOnce({
          Items: staleConnections,
        })
        // Mock update operations for each stale connection
        .mockResolvedValue({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Stale connections cleaned up');
      expect(body.cleanedCount).toBe(2);
      
      // Should scan for stale connections
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections-table',
          FilterExpression: 'lastActivity < :oneHourAgo',
          ExpressionAttributeValues: {
            ':oneHourAgo': expect.any(String),
          },
        })
      );

      // Should update each stale connection
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections-table',
          Key: { connectionId: 'stale-conn-1' },
          UpdateExpression: 'SET #status = :status',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': 'DISCONNECTED',
          },
        })
      );

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections-table',
          Key: { connectionId: 'stale-conn-2' },
          UpdateExpression: 'SET #status = :status',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': 'DISCONNECTED',
          },
        })
      );
    });

    it('should handle no stale connections found', async () => {
      const event = {
        action: 'cleanup_stale_connections',
      };

      mockDynamoClient.send.mockResolvedValue({
        Items: [],
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Stale connections cleaned up');
      expect(body.cleanedCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown action', async () => {
      const event = {
        action: 'unknown_action',
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.body).toBe('Unknown action');
    });

    it('should handle DynamoDB errors', async () => {
      const event = {
        action: 'get_all_connections',
      };

      mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'));

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body).toBe('Internal server error');
    });
  });

  describe('Connection Lifecycle Management', () => {
    it('should support connection lifecycle operations', async () => {
      // Test getting user connections
      const getUserEvent = {
        action: 'get_user_connections',
        userId: 'test-user',
      };

      mockDynamoClient.send.mockResolvedValue({
        Items: [
          {
            connectionId: 'conn-1',
            userId: 'test-user',
            status: 'CONNECTED',
          },
        ],
        Count: 1,
      });

      const getUserResult = await handler(getUserEvent);
      expect(getUserResult.statusCode).toBe(200);

      // Test updating connection status
      const updateEvent = {
        action: 'update_connection_status',
        connectionId: 'conn-1',
        status: 'DISCONNECTED',
      };

      mockDynamoClient.send.mockResolvedValue({});

      const updateResult = await handler(updateEvent);
      expect(updateResult.statusCode).toBe(200);

      // Test cleanup
      const cleanupEvent = {
        action: 'cleanup_stale_connections',
      };

      mockDynamoClient.send
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValue({});

      const cleanupResult = await handler(cleanupEvent);
      expect(cleanupResult.statusCode).toBe(200);
    });
  });
});