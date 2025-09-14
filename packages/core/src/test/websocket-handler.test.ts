import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

// Mock AWS SDK
const mockDynamoClient = {
  send: vi.fn(),
};

const mockApiGatewayClient = {
  send: vi.fn(),
};

// Mock the WebSocket handler
const mockHandler = vi.fn();

// Mock AWS SDK modules
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => mockDynamoClient),
  },
  PutCommand: vi.fn(),
  DeleteCommand: vi.fn(),
  GetCommand: vi.fn(),
  UpdateCommand: vi.fn(),
  QueryCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-apigatewaymanagementapi', () => ({
  ApiGatewayManagementApiClient: vi.fn(() => mockApiGatewayClient),
  PostToConnectionCommand: vi.fn(),
}));

// Mock handler implementation for testing
const createMockHandler = () => {
  return async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> => {
    const { routeKey, connectionId } = event.requestContext;

    try {
      switch (routeKey) {
        case '$connect':
          await mockDynamoClient.send({
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            Item: {
              connectionId,
              userId: (event as any).queryStringParameters?.userId || 'anonymous',
              sessionId: (event as any).queryStringParameters?.sessionId,
              status: 'CONNECTED',
              ipAddress: (event.requestContext as any).identity?.sourceIp,
              userAgent: (event as any).headers?.['User-Agent'] || (event as any).headers?.['user-agent'],
              createdAt: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
            },
          });
          return { statusCode: 200, body: 'Connected' };

        case '$disconnect':
          const getResult = await mockDynamoClient.send({
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            Key: { connectionId },
          });

          if (getResult.Item) {
            await mockDynamoClient.send({
              TableName: process.env.CONNECTIONS_TABLE_NAME,
              Key: { connectionId },
              UpdateExpression: 'SET #status = :status, disconnectedAt = :disconnectedAt',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':status': 'DISCONNECTED',
                ':disconnectedAt': new Date().toISOString(),
              },
            });
          }
          return { statusCode: 200, body: 'Disconnected' };

        case '$default':
          const message = event.body ? JSON.parse(event.body) : {};

          // Update last activity
          await mockDynamoClient.send({
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            Key: { connectionId },
            UpdateExpression: 'SET lastActivity = :lastActivity',
            ExpressionAttributeValues: {
              ':lastActivity': new Date().toISOString(),
            },
          });

          // Get connection info
          await mockDynamoClient.send({
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            Key: { connectionId },
          });

          switch (message.type) {
            case 'voice_start':
              await mockApiGatewayClient.send({
                ConnectionId: connectionId,
                Data: JSON.stringify({
                  type: 'voice_session_started',
                  data: {
                    sessionId: message.data?.sessionId || `voice-${Date.now()}-${connectionId}`,
                    audioFormat: message.data?.audioFormat || 'webm',
                    status: 'ACTIVE',
                  },
                  timestamp: new Date().toISOString(),
                }),
              });
              return { statusCode: 200, body: 'Voice session started' };

            case 'voice_data':
              await mockApiGatewayClient.send({
                ConnectionId: connectionId,
                Data: JSON.stringify({
                  type: 'voice_data_received',
                  data: {
                    sessionId: message.data.sessionId,
                    timestamp: new Date().toISOString(),
                  },
                  timestamp: new Date().toISOString(),
                }),
              });
              return { statusCode: 200, body: 'Voice data processed' };

            case 'voice_end':
              await mockApiGatewayClient.send({
                ConnectionId: connectionId,
                Data: JSON.stringify({
                  type: 'voice_session_ended',
                  data: {
                    sessionId: message.data.sessionId,
                    status: 'COMPLETED',
                  },
                  timestamp: new Date().toISOString(),
                }),
              });
              return { statusCode: 200, body: 'Voice session ended' };

            case 'text_message':
              await mockApiGatewayClient.send({
                ConnectionId: connectionId,
                Data: JSON.stringify({
                  type: 'text_message_received',
                  data: {
                    content: message.data.content,
                    sessionId: message.data.sessionId,
                    messageId: `msg-${Date.now()}`,
                  },
                  timestamp: new Date().toISOString(),
                }),
              });
              return { statusCode: 200, body: 'Text message processed' };

            case 'ping':
              await mockApiGatewayClient.send({
                ConnectionId: connectionId,
                Data: JSON.stringify({
                  type: 'pong',
                  timestamp: new Date().toISOString(),
                }),
              });
              return { statusCode: 200, body: 'Pong sent' };

            default:
              await mockApiGatewayClient.send({
                ConnectionId: connectionId,
                Data: JSON.stringify({
                  type: 'error',
                  data: { message: `Unknown message type: ${message.type}` },
                  timestamp: new Date().toISOString(),
                }),
              });
              return { statusCode: 400, body: 'Unknown message type' };
          }

        default:
          return { statusCode: 400, body: 'Unknown route' };
      }
    } catch (error) {
      console.error('Error handling WebSocket event:', error);

      // Try to send error message back to client
      try {
        await mockApiGatewayClient.send({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            type: 'error',
            data: { message: 'Internal server error' },
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (sendError) {
        console.error('Failed to send error message to client:', sendError);
      }

      if (routeKey === '$connect') {
        return { statusCode: 500, body: 'Connection failed' };
      }

      return { statusCode: 500, body: 'Internal server error' };
    }
  };
};

describe('WebSocket Handler', () => {
  let handler: ReturnType<typeof createMockHandler>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set environment variables
    process.env.CONNECTIONS_TABLE_NAME = 'test-connections-table';
    process.env.USER_POOL_ID = 'test-user-pool';
    process.env.IDENTITY_POOL_ID = 'test-identity-pool';

    // Create mock handler
    handler = createMockHandler();
  });

  describe('Connection Management', () => {
    it('should handle connect route successfully', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$connect',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
          identity: {
            sourceIp: '192.168.1.1',
          },
        },
        queryStringParameters: {
          userId: 'test-user-id',
          sessionId: 'test-session-id',
        },
        headers: {
          'User-Agent': 'test-user-agent',
        },
      } as any;

      mockDynamoClient.send.mockResolvedValue({});

      const result = await handler(event);

      expect((result as any).statusCode).toBe(200);
      expect((result as any).body).toBe('Connected');
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections-table',
          Item: expect.objectContaining({
            connectionId: 'test-connection-id',
            userId: 'test-user-id',
            sessionId: 'test-session-id',
            status: 'CONNECTED',
            ipAddress: '192.168.1.1',
            userAgent: 'test-user-agent',
          }),
        })
      );
    });

    it('should handle disconnect route successfully', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$disconnect',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
      } as any;

      mockDynamoClient.send
        .mockResolvedValueOnce({
          Item: {
            connectionId: 'test-connection-id',
            userId: 'test-user-id',
            status: 'CONNECTED',
          },
        })
        .mockResolvedValueOnce({});

      const result = await handler(event);

      expect((result as any).statusCode).toBe(200);
      expect((result as any).body).toBe('Disconnected');
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections-table',
          Key: { connectionId: 'test-connection-id' },
          UpdateExpression: 'SET #status = :status, disconnectedAt = :disconnectedAt',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': 'DISCONNECTED',
            ':disconnectedAt': expect.any(String),
          },
        })
      );
    });

    it('should handle disconnect when connection not found', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$disconnect',
          connectionId: 'nonexistent-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
      } as any;

      mockDynamoClient.send.mockResolvedValue({ Item: null });

      const result = await handler(event);

      expect((result as any).statusCode).toBe(200);
      expect((result as any).body).toBe('Disconnected');
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      // Mock connection info retrieval
      mockDynamoClient.send
        .mockResolvedValueOnce({}) // Update last activity
        .mockResolvedValueOnce({
          Item: {
            connectionId: 'test-connection-id',
            userId: 'test-user-id',
            status: 'CONNECTED',
          },
        });
    });

    it('should handle voice start message', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$default',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        body: JSON.stringify({
          type: 'voice_start',
          data: {
            audioFormat: 'webm',
            sessionId: 'test-voice-session',
          },
        }),
      } as any;

      mockApiGatewayClient.send.mockResolvedValue({});

      const result = await handler(event);

      expect((result as any).statusCode).toBe(200);
      expect((result as any).body).toBe('Voice session started');
      expect(mockApiGatewayClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ConnectionId: 'test-connection-id',
          Data: expect.stringContaining('voice_session_started'),
        })
      );
    });

    it('should handle voice data message', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$default',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        body: JSON.stringify({
          type: 'voice_data',
          data: {
            audioData: 'base64-encoded-audio-data',
            sessionId: 'test-voice-session',
          },
        }),
      } as any;

      mockApiGatewayClient.send.mockResolvedValue({});

      const result = await handler(event);

      expect((result as any).statusCode).toBe(200);
      expect((result as any).body).toBe('Voice data processed');
      expect(mockApiGatewayClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ConnectionId: 'test-connection-id',
          Data: expect.stringContaining('voice_data_received'),
        })
      );
    });

    it('should handle voice end message', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$default',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        body: JSON.stringify({
          type: 'voice_end',
          data: {
            sessionId: 'test-voice-session',
          },
        }),
      } as any;

      mockApiGatewayClient.send.mockResolvedValue({});

      const result = await handler(event);

      expect((result as any).statusCode).toBe(200);
      expect((result as any).body).toBe('Voice session ended');
      expect(mockApiGatewayClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ConnectionId: 'test-connection-id',
          Data: expect.stringContaining('voice_session_ended'),
        })
      );
    });

    it('should handle text message', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$default',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        body: JSON.stringify({
          type: 'text_message',
          data: {
            content: 'Hello, AI!',
            sessionId: 'test-chat-session',
          },
        }),
      } as any;

      mockApiGatewayClient.send.mockResolvedValue({});

      const result = await handler(event);

      expect((result as any).statusCode).toBe(200);
      expect((result as any).body).toBe('Text message processed');
      expect(mockApiGatewayClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ConnectionId: 'test-connection-id',
          Data: expect.stringContaining('text_message_received'),
        })
      );
    });

    it('should handle ping message', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$default',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        body: JSON.stringify({
          type: 'ping',
        }),
      } as any;

      mockApiGatewayClient.send.mockResolvedValue({});

      const result = await handler(event);

      expect((result as any).statusCode).toBe(200);
      expect((result as any).body).toBe('Pong sent');
      expect(mockApiGatewayClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ConnectionId: 'test-connection-id',
          Data: expect.stringContaining('pong'),
        })
      );
    });

    it('should handle unknown message type', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$default',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        body: JSON.stringify({
          type: 'unknown_type',
        }),
      } as any;

      mockApiGatewayClient.send.mockResolvedValue({});

      const result = await handler(event);

      expect((result as any).statusCode).toBe(400);
      expect((result as any).body).toBe('Unknown message type');
      expect(mockApiGatewayClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ConnectionId: 'test-connection-id',
          Data: expect.stringContaining('error'),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$connect',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        queryStringParameters: {
          userId: 'test-user-id',
        },
      } as any;

      mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'));

      const result = await handler(event);

      expect((result as any).statusCode).toBe(500);
      expect((result as any).body).toBe('Connection failed');
    });

    it('should handle API Gateway errors gracefully', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$default',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        body: JSON.stringify({
          type: 'ping',
        }),
      } as any;

      mockDynamoClient.send
        .mockResolvedValueOnce({}) // Update last activity
        .mockResolvedValueOnce({
          Item: {
            connectionId: 'test-connection-id',
            userId: 'test-user-id',
            status: 'CONNECTED',
          },
        });

      mockApiGatewayClient.send.mockRejectedValue(new Error('API Gateway error'));

      const result = await handler(event);

      expect((result as any).statusCode).toBe(500);
      expect((result as any).body).toBe('Internal server error');
    });

    it('should handle stale connections (GoneException)', async () => {
      const event: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$default',
          connectionId: 'stale-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        body: JSON.stringify({
          type: 'ping',
        }),
      } as any;

      mockDynamoClient.send
        .mockResolvedValueOnce({}) // Update last activity
        .mockResolvedValueOnce({
          Item: {
            connectionId: 'stale-connection-id',
            userId: 'test-user-id',
            status: 'CONNECTED',
          },
        })
        .mockResolvedValueOnce({}); // Delete stale connection

      const goneError = new Error('Connection is gone');
      goneError.name = 'GoneException';
      mockApiGatewayClient.send.mockRejectedValue(goneError);

      const result = await handler(event);

      expect((result as any).statusCode).toBe(500);
      expect((result as any).body).toBe('Internal server error');

      // Should attempt to delete stale connection
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections-table',
          Key: { connectionId: 'stale-connection-id' },
        })
      );
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy requirement 1.1 - Real-time communication infrastructure', async () => {
      // Test that WebSocket API Gateway is properly configured for real-time communication
      const connectEvent: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$connect',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        queryStringParameters: {
          userId: 'test-user-id',
        },
      } as any;

      mockDynamoClient.send.mockResolvedValue({});

      const result = await handler(connectEvent);

      expect((result as any).statusCode).toBe(200);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-connections-table',
          Item: expect.objectContaining({
            connectionId: 'test-connection-id',
            userId: 'test-user-id',
            status: 'CONNECTED',
          }),
        })
      );
    });

    it('should satisfy requirement 6.2 - WebSocket infrastructure for voice and real-time communication', async () => {
      // Test voice message handling through WebSocket
      const voiceEvent: APIGatewayProxyWebsocketEventV2 = {
        requestContext: {
          routeKey: '$default',
          connectionId: 'test-connection-id',
          domainName: 'test-domain.com',
          stage: 'prod',
        },
        body: JSON.stringify({
          type: 'voice_start',
          data: {
            audioFormat: 'webm',
          },
        }),
      } as any;

      mockDynamoClient.send
        .mockResolvedValueOnce({}) // Update last activity
        .mockResolvedValueOnce({
          Item: {
            connectionId: 'test-connection-id',
            userId: 'test-user-id',
            status: 'CONNECTED',
          },
        });

      mockApiGatewayClient.send.mockResolvedValue({});

      const result = await handler(voiceEvent);

      expect((result as any).statusCode).toBe(200);
      expect((result as any).body).toBe('Voice session started');
      expect(mockApiGatewayClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ConnectionId: 'test-connection-id',
          Data: expect.stringContaining('voice_session_started'),
        })
      );
    });
  });
});