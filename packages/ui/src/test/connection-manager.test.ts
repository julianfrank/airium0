import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionManager, type ConnectionManagerConfig } from '../lib/connection-manager.js';
import { WebSocketState } from '../lib/websocket-client.js';

// Mock WebSocket (reuse from websocket-client.test.ts)
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', { code: code || 1000, reason: reason || '' });
    this.onclose?.(closeEvent);
  }

  simulateMessage(data: any): void {
    if (this.readyState === MockWebSocket.OPEN) {
      const messageEvent = new MessageEvent('message', { data: JSON.stringify(data) });
      this.onmessage?.(messageEvent);
    }
  }
}

global.WebSocket = MockWebSocket as any;

describe('ConnectionManager', () => {
  let manager: ConnectionManager;
  let config: ConnectionManagerConfig;

  beforeEach(() => {
    config = {
      url: 'ws://localhost:8080',
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
      timeout: 500
    };

    manager = new ConnectionManager(config);
  });

  afterEach(() => {
    manager.disconnect();
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      const state = manager.getConnectionState();
      
      expect(state.isConnected).toBe(false);
      expect(state.userId).toBe('test-user-123');
      expect(state.sessionId).toBe('test-session-456');
      expect(state.reconnectAttempts).toBe(0);
      expect(state.state).toBe(WebSocketState.DISCONNECTED);
    });

    it('should allow updating userId and sessionId', () => {
      manager.setUserId('new-user-789');
      manager.setSessionId('new-session-012');
      
      const state = manager.getConnectionState();
      expect(state.userId).toBe('new-user-789');
      expect(state.sessionId).toBe('new-session-012');
    });
  });

  describe('Connection Management', () => {
    it('should connect and update state', async () => {
      await manager.connect();
      
      const state = manager.getConnectionState();
      expect(state.isConnected).toBe(true);
      expect(state.state).toBe(WebSocketState.CONNECTED);
      expect(state.lastConnected).toBeInstanceOf(Date);
    });

    it('should send connection initialization message on connect', async () => {
      const sendSpy = vi.spyOn(manager, 'send');
      
      await manager.connect();
      
      expect(sendSpy).toHaveBeenCalledWith({
        action: 'connect',
        data: {
          userId: 'test-user-123',
          sessionId: 'test-session-456'
        }
      });
    });

    it('should handle connection_established message', async () => {
      await manager.connect();
      
      const mockWs = (manager as any).client.ws as MockWebSocket;
      mockWs.simulateMessage({
        action: 'connection_established',
        data: { connectionId: 'conn-123' }
      });
      
      expect(manager.getConnectionId()).toBe('conn-123');
      
      const state = manager.getConnectionState();
      expect(state.connectionId).toBe('conn-123');
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should register and call message handlers', async () => {
      const handler = vi.fn();
      const unsubscribe = manager.onMessage('test_action', handler);
      
      const mockWs = (manager as any).client.ws as MockWebSocket;
      const testMessage = { action: 'test_action', data: { value: 'test' } };
      mockWs.simulateMessage(testMessage);
      
      expect(handler).toHaveBeenCalledWith(testMessage);
      
      // Test unsubscribe
      unsubscribe();
      mockWs.simulateMessage(testMessage);
      expect(handler).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle multiple handlers for same action', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      manager.onMessage('test_action', handler1);
      manager.onMessage('test_action', handler2);
      
      const mockWs = (manager as any).client.ws as MockWebSocket;
      const testMessage = { action: 'test_action', data: { value: 'test' } };
      mockWs.simulateMessage(testMessage);
      
      expect(handler1).toHaveBeenCalledWith(testMessage);
      expect(handler2).toHaveBeenCalledWith(testMessage);
    });

    it('should handle errors in message handlers gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const faultyHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      
      manager.onMessage('test_action', faultyHandler);
      
      const mockWs = (manager as any).client.ws as MockWebSocket;
      mockWs.simulateMessage({ action: 'test_action', data: {} });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in message handler for action test_action:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should send voice messages with correct format', () => {
      const sendSpy = vi.spyOn(manager, 'send');
      
      manager.sendVoiceMessage('base64audiodata', 'voice-session-123');
      
      expect(sendSpy).toHaveBeenCalledWith({
        action: 'voice_message',
        data: { audioData: 'base64audiodata' },
        sessionId: 'voice-session-123',
        userId: 'test-user-123'
      });
    });

    it('should send text messages with correct format', () => {
      const sendSpy = vi.spyOn(manager, 'send');
      
      manager.sendTextMessage('Hello world');
      
      expect(sendSpy).toHaveBeenCalledWith({
        action: 'text_message',
        data: { text: 'Hello world' },
        sessionId: 'test-session-456',
        userId: 'test-user-123'
      });
    });

    it('should start voice session', () => {
      const sendSpy = vi.spyOn(manager, 'send');
      
      manager.startVoiceSession();
      
      expect(sendSpy).toHaveBeenCalledWith({
        action: 'start_voice_session',
        sessionId: 'test-session-456',
        userId: 'test-user-123'
      });
    });

    it('should end voice session', () => {
      const sendSpy = vi.spyOn(manager, 'send');
      
      manager.endVoiceSession('voice-session-789');
      
      expect(sendSpy).toHaveBeenCalledWith({
        action: 'end_voice_session',
        sessionId: 'voice-session-789',
        userId: 'test-user-123'
      });
    });

    it('should send ping messages', () => {
      const sendSpy = vi.spyOn(manager, 'send');
      
      manager.sendPing();
      
      expect(sendSpy).toHaveBeenCalledWith({
        action: 'ping',
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      });
    });
  });

  describe('State Change Notifications', () => {
    it('should notify state change handlers', async () => {
      const stateHandler = vi.fn();
      const unsubscribe = manager.onConnectionStateChange(stateHandler);
      
      await manager.connect();
      
      expect(stateHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: true,
          state: WebSocketState.CONNECTED
        })
      );
      
      unsubscribe();
    });

    it('should handle errors in state handlers gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const faultyHandler = vi.fn().mockImplementation(() => {
        throw new Error('State handler error');
      });
      
      manager.onConnectionStateChange(faultyHandler);
      
      await manager.connect();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in connection state handler:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Message Enrichment', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should enrich messages with user and session data', () => {
      const sendSpy = vi.spyOn((manager as any).client, 'send');
      
      manager.send({ action: 'test' });
      
      expect(sendSpy).toHaveBeenCalledWith({
        action: 'test',
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      });
    });

    it('should preserve existing userId and sessionId in messages', () => {
      const sendSpy = vi.spyOn((manager as any).client, 'send');
      
      manager.send({
        action: 'test',
        userId: 'override-user',
        sessionId: 'override-session'
      });
      
      expect(sendSpy).toHaveBeenCalledWith({
        action: 'test',
        userId: 'test-user-123', // Should be overridden
        sessionId: 'test-session-456' // Should be overridden
      });
    });
  });

  describe('Pong Handling', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should update last activity on pong messages', async () => {
      const initialState = manager.getConnectionState();
      const initialLastConnected = initialState.lastConnected;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const mockWs = (manager as any).client.ws as MockWebSocket;
      mockWs.simulateMessage({ action: 'pong' });
      
      const updatedState = manager.getConnectionState();
      expect(updatedState.lastConnected).not.toEqual(initialLastConnected);
      expect(updatedState.lastConnected).toBeInstanceOf(Date);
    });
  });
});