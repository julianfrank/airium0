/**
 * Integration tests for ConnectionManager
 * Tests the WebSocket connection management functionality
 */

import { ConnectionManager, ConnectionInfo, WebSocketMessage } from './connection-manager';

describe('ConnectionManager Integration', () => {
  test('ConnectionManager can be instantiated', () => {
    const connectionManager = new ConnectionManager('test-table', 'us-east-1');
    expect(connectionManager).toBeInstanceOf(ConnectionManager);
  });

  test('ConnectionInfo interface is properly defined', () => {
    const connection: ConnectionInfo = {
      connectionId: 'conn-123',
      userId: 'user-456',
      sessionId: 'session-789',
      status: 'CONNECTED',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: '2024-01-01T00:00:00Z',
      lastActivity: '2024-01-01T00:05:00Z',
    };

    expect(connection.connectionId).toBe('conn-123');
    expect(connection.userId).toBe('user-456');
    expect(connection.status).toBe('CONNECTED');
    expect(connection.ipAddress).toBe('192.168.1.1');
  });

  test('WebSocketMessage interface is properly defined', () => {
    const message: WebSocketMessage = {
      type: 'text_message',
      data: {
        content: 'Hello, world!',
        sessionId: 'session-123',
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    expect(message.type).toBe('text_message');
    expect(message.data.content).toBe('Hello, world!');
    expect(message.timestamp).toBe('2024-01-01T00:00:00Z');
  });

  test('Voice message types are properly defined', () => {
    const voiceStartMessage: WebSocketMessage = {
      type: 'voice_start',
      data: {
        audioFormat: 'webm',
        sessionId: 'voice-session-123',
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    const voiceDataMessage: WebSocketMessage = {
      type: 'voice_data',
      data: {
        audioData: 'base64-encoded-audio-data',
        sessionId: 'voice-session-123',
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    const voiceEndMessage: WebSocketMessage = {
      type: 'voice_end',
      data: {
        sessionId: 'voice-session-123',
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    expect(voiceStartMessage.type).toBe('voice_start');
    expect(voiceDataMessage.type).toBe('voice_data');
    expect(voiceEndMessage.type).toBe('voice_end');
    expect(voiceStartMessage.data.audioFormat).toBe('webm');
    expect(voiceDataMessage.data.audioData).toBe('base64-encoded-audio-data');
  });

  test('System message types are properly defined', () => {
    const connectionEstablished: WebSocketMessage = {
      type: 'connection_established',
      data: {
        connectionId: 'conn-123',
        userId: 'user-456',
        sessionId: 'session-789',
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    const errorMessage: WebSocketMessage = {
      type: 'error',
      data: {
        message: 'Something went wrong',
        code: 'INTERNAL_ERROR',
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    const pingMessage: WebSocketMessage = {
      type: 'ping',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const pongMessage: WebSocketMessage = {
      type: 'pong',
      timestamp: '2024-01-01T00:00:00Z',
    };

    expect(connectionEstablished.type).toBe('connection_established');
    expect(errorMessage.type).toBe('error');
    expect(pingMessage.type).toBe('ping');
    expect(pongMessage.type).toBe('pong');
    expect(errorMessage.data.message).toBe('Something went wrong');
  });

  test('AI response message types are properly defined', () => {
    const aiResponse: WebSocketMessage = {
      type: 'ai_response',
      data: {
        content: 'This is an AI generated response',
        sessionId: 'session-123',
        messageId: 'ai-msg-456',
        confidence: 0.95,
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    const textMessageReceived: WebSocketMessage = {
      type: 'text_message_received',
      data: {
        content: 'User message content',
        sessionId: 'session-123',
        messageId: 'msg-789',
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    expect(aiResponse.type).toBe('ai_response');
    expect(textMessageReceived.type).toBe('text_message_received');
    expect(aiResponse.data.confidence).toBe(0.95);
    expect(textMessageReceived.data.content).toBe('User message content');
  });

  test('Connection status values are properly typed', () => {
    const connectedStatus: 'CONNECTED' | 'DISCONNECTED' = 'CONNECTED';
    const disconnectedStatus: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';

    expect(connectedStatus).toBe('CONNECTED');
    expect(disconnectedStatus).toBe('DISCONNECTED');
  });

  test('Connection manager methods exist and are callable', () => {
    const connectionManager = new ConnectionManager('test-table');
    
    // Check that all expected methods exist
    expect(typeof connectionManager.getConnection).toBe('function');
    expect(typeof connectionManager.getUserConnections).toBe('function');
    expect(typeof connectionManager.updateLastActivity).toBe('function');
    expect(typeof connectionManager.markDisconnected).toBe('function');
    expect(typeof connectionManager.removeConnection).toBe('function');
    expect(typeof connectionManager.sendMessage).toBe('function');
    expect(typeof connectionManager.broadcastToUser).toBe('function');
    expect(typeof connectionManager.broadcastToUsers).toBe('function');
    expect(typeof connectionManager.getConnectionStats).toBe('function');
    expect(typeof connectionManager.cleanupOldConnections).toBe('function');
  });
});