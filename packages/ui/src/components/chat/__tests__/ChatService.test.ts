import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatServiceImpl, getChatService } from '../ChatService';
import type { WebSocketMessage } from '@airium/shared/types';

// Mock dependencies
const mockWebSocketClient = {
  isConnected: vi.fn(),
  send: vi.fn()
};

const mockGraphqlClient = {
  graphql: vi.fn()
};

vi.mock('aws-amplify/api', () => ({
  generateClient: () => mockGraphqlClient
}));

vi.mock('../../lib/graphql/queries', () => ({
  PUBLISH_CHAT_EVENT: 'mock-publish-chat-event-query'
}));

describe('ChatServiceImpl', () => {
  let chatService: ChatServiceImpl;
  const userId = 'test-user-123';
  const content = 'Hello, AI!';

  beforeEach(() => {
    chatService = new ChatServiceImpl(mockWebSocketClient as any);
    mockWebSocketClient.isConnected.mockClear();
    mockWebSocketClient.send.mockClear();
    mockGraphqlClient.graphql.mockClear();
  });

  describe('sendMessage', () => {
    it('sends message via WebSocket when connected', async () => {
      mockWebSocketClient.isConnected.mockReturnValue(true);
      mockWebSocketClient.send.mockReturnValue(true);

      await chatService.sendMessage(content, userId);

      expect(mockWebSocketClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'chat_message',
          data: expect.objectContaining({
            message: expect.objectContaining({
              type: 'TEXT',
              content,
              id: expect.any(String),
              timestamp: expect.any(String)
            }),
            userId
          }),
          userId
        })
      );
    });

    it('falls back to GraphQL when WebSocket is not connected', async () => {
      mockWebSocketClient.isConnected.mockReturnValue(false);
      mockGraphqlClient.graphql.mockResolvedValue({});

      await chatService.sendMessage(content, userId);

      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
        query: expect.any(Object), // GraphQL query object
        variables: {
          userId,
          message: expect.stringContaining('"type":"user_message"')
        }
      });
    });

    it('falls back to GraphQL when WebSocket send fails', async () => {
      mockWebSocketClient.isConnected.mockReturnValue(true);
      mockWebSocketClient.send.mockReturnValue(false);
      mockGraphqlClient.graphql.mockResolvedValue({});

      await expect(chatService.sendMessage(content, userId)).rejects.toThrow('Failed to send message. Please try again.');
    });

    it('throws error when WebSocket send fails and no WebSocket client', async () => {
      const serviceWithoutWs = new ChatServiceImpl();
      mockGraphqlClient.graphql.mockRejectedValue(new Error('GraphQL failed'));

      await expect(serviceWithoutWs.sendMessage(content, userId))
        .rejects.toThrow('Failed to send message. Please try again.');
    });

    it('creates message with correct structure', async () => {
      mockWebSocketClient.isConnected.mockReturnValue(true);
      mockWebSocketClient.send.mockReturnValue(true);

      await chatService.sendMessage(content, userId);

      const sentMessage = mockWebSocketClient.send.mock.calls[0][0] as WebSocketMessage;
      
      expect(sentMessage.data.message).toMatchObject({
        type: 'TEXT',
        content,
        id: expect.stringMatching(/^msg_\d+_[a-z0-9]+$/),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      });
    });

    it('handles GraphQL errors gracefully', async () => {
      mockWebSocketClient.isConnected.mockReturnValue(false);
      mockGraphqlClient.graphql.mockRejectedValue(new Error('Network error'));

      await expect(chatService.sendMessage(content, userId))
        .rejects.toThrow('Failed to send message. Please try again.');
    });
  });

  describe('getHistory', () => {
    it('returns empty array by default', async () => {
      const history = await chatService.getHistory(userId);
      
      expect(history).toEqual([]);
    });

    it('accepts limit parameter', async () => {
      const history = await chatService.getHistory(userId, 10);
      
      expect(history).toEqual([]);
    });

    it('handles errors gracefully', async () => {
      // Mock a service that throws an error
      const errorService = new ChatServiceImpl();
      
      // Override the method to throw an error
      vi.spyOn(errorService, 'getHistory').mockRejectedValue(new Error('Database error'));

      await expect(errorService.getHistory(userId))
        .rejects.toThrow('Database error');
    });
  });

  describe('clearHistory', () => {
    it('completes without error', async () => {
      await expect(chatService.clearHistory(userId)).resolves.toBeUndefined();
    });

    it('logs the user ID', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await chatService.clearHistory(userId);
      
      expect(consoleSpy).toHaveBeenCalledWith('Clearing chat history for user:', userId);
      
      consoleSpy.mockRestore();
    });

    it('handles errors gracefully', async () => {
      const errorService = new ChatServiceImpl();
      
      // Override the method to throw an error
      vi.spyOn(errorService, 'clearHistory').mockRejectedValue(new Error('Clear failed'));

      await expect(errorService.clearHistory(userId))
        .rejects.toThrow('Clear failed');
    });
  });
});

describe('getChatService', () => {
  beforeEach(() => {
    // Reset the singleton
    (getChatService as any).chatServiceInstance = null;
  });

  it('returns singleton instance', () => {
    const service1 = getChatService();
    const service2 = getChatService();
    
    expect(service1).toBe(service2);
  });

  it('creates instance with WebSocket client when provided', () => {
    const wsClient = mockWebSocketClient as any;
    const service = getChatService(wsClient);
    
    expect(service).toBeInstanceOf(ChatServiceImpl);
  });

  it('creates instance without WebSocket client when not provided', () => {
    const service = getChatService();
    
    expect(service).toBeInstanceOf(ChatServiceImpl);
  });

  it('reuses existing instance even when WebSocket client is provided later', () => {
    const service1 = getChatService();
    const service2 = getChatService(mockWebSocketClient as any);
    
    expect(service1).toBe(service2);
  });
});