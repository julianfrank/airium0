import { WebSocketClient } from '../../lib/websocket-client';
import { generateClient } from 'aws-amplify/api';
import { PUBLISH_CHAT_EVENT } from '../../lib/graphql/queries';
import type { ChatService, Message } from './types';
import type { WebSocketMessage, ChatMessage } from '@airium/shared';

export class ChatServiceImpl implements ChatService {
  private wsClient: WebSocketClient | null = null;
  private graphqlClient = generateClient();

  constructor(wsClient?: WebSocketClient) {
    this.wsClient = wsClient || null;
  }

  async sendMessage(content: string, userId: string): Promise<void> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const chatMessage: ChatMessage = {
      id: messageId,
      type: 'TEXT',
      content,
      timestamp
    };

    try {
      // Send via WebSocket for real-time processing
      if (this.wsClient && this.wsClient.isConnected()) {
        const wsMessage: WebSocketMessage = {
          action: 'chat_message',
          data: {
            message: chatMessage,
            userId
          },
          userId
        };

        const sent = this.wsClient.send(wsMessage);
        if (!sent) {
          throw new Error('Failed to send message via WebSocket');
        }
      } else {
        // Fallback to GraphQL mutation
        await this.graphqlClient.graphql({
          query: PUBLISH_CHAT_EVENT,
          variables: {
            userId,
            message: JSON.stringify({
              message: chatMessage,
              type: 'user_message'
            })
          }
        });
      }
    } catch (error) {
      console.error('Failed to send chat message:', error);
      throw new Error('Failed to send message. Please try again.');
    }
  }

  async getHistory(userId: string, limit: number = 50): Promise<Message[]> {
    try {
      // In a real implementation, this would fetch from DynamoDB
      // For now, return empty array as history is managed in real-time
      // through subscriptions
      return [];
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      throw new Error('Failed to load chat history');
    }
  }

  async clearHistory(userId: string): Promise<void> {
    try {
      // In a real implementation, this would clear the user's chat history
      // from DynamoDB
      console.log('Clearing chat history for user:', userId);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      throw new Error('Failed to clear chat history');
    }
  }
}

// Singleton instance
let chatServiceInstance: ChatServiceImpl | null = null;

export function getChatService(wsClient?: WebSocketClient): ChatServiceImpl {
  if (!chatServiceInstance) {
    chatServiceInstance = new ChatServiceImpl(wsClient);
  }
  return chatServiceInstance;
}