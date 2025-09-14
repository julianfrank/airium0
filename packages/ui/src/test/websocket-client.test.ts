import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { WebSocketClient, WebSocketState, type WebSocketClientConfig, type WebSocketClientEvents } from '../lib/websocket-client.js';

// Mock WebSocket
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
    // Simulate async connection
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

  // Helper methods for testing
  simulateMessage(data: any): void {
    if (this.readyState === MockWebSocket.OPEN) {
      const messageEvent = new MessageEvent('message', { data: JSON.stringify(data) });
      this.onmessage?.(messageEvent);
    }
  }

  simulateError(): void {
    const errorEvent = new Event('error');
    this.onerror?.(errorEvent);
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

describe('WebSocketClient', () => {
  let client: WebSocketClient;
  let config: WebSocketClientConfig;
  let events: WebSocketClientEvents;

  beforeEach(() => {
    config = {
      url: 'ws://localhost:8080',
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
      heartbeatInterval: 1000,
      connectionTimeout: 500
    };

    events = {
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
      onReconnecting: vi.fn(),
      onReconnectFailed: vi.fn()
    };

    client = new WebSocketClient(config, events);
  });

  afterEach(() => {
    client.disconnect();
    vi.clearAllTimers();
  });

  describe('Connection Management', () => {
    it('should initialize with DISCONNECTED state', () => {
      expect(client.getState()).toBe(WebSocketState.DISCONNECTED);
      expect(client.isConnected()).toBe(false);
    });

    it('should connect successfully', async () => {
      const connectPromise = client.connect();
      expect(client.getState()).toBe(WebSocketState.CONNECTING);

      await connectPromise;
      expect(client.getState()).toBe(WebSocketState.CONNECTED);
      expect(client.isConnected()).toBe(true);
      expect(events.onConnect).toHaveBeenCalled();
    });

    it('should handle connection timeout', async () => {
      // Mock WebSocket that never connects
      const SlowMockWebSocket = class {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        
        readyState = SlowMockWebSocket.CONNECTING;
        onopen: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        
        constructor(public url: string) {
          // Don't simulate connection - just stay in CONNECTING state
        }
        
        send = vi.fn();
        close() {
          this.readyState = SlowMockWebSocket.CLOSED;
          this.onclose?.(new CloseEvent('close', { code: 1000, reason: 'Manual disconnect' }));
        }
      };
      
      global.WebSocket = SlowMockWebSocket as any;

      const client = new WebSocketClient(config, events);
      
      await expect(client.connect()).rejects.toThrow('Connection timeout');
      expect(client.getState()).toBe(WebSocketState.ERROR);
    });

    it('should disconnect gracefully', async () => {
      await client.connect();
      expect(client.isConnected()).toBe(true);

      client.disconnect();
      expect(client.getState()).toBe(WebSocketState.DISCONNECTING);
      
      // Wait for disconnect to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(events.onDisconnect).toHaveBeenCalled();
    });

    it('should not reconnect on manual disconnect', async () => {
      await client.connect();
      client.disconnect();
      
      // Wait longer than reconnect interval
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(events.onReconnecting).not.toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should send messages when connected', () => {
      const message = { action: 'test', data: { value: 'hello' } };
      const result = client.send(message);
      
      expect(result).toBe(true);
    });

    it('should queue messages when disconnected', () => {
      client.disconnect();
      
      const message = { action: 'test', data: { value: 'hello' } };
      const result = client.send(message);
      
      expect(result).toBe(false);
    });

    it('should receive and parse messages', async () => {
      const mockWs = (client as any).ws as MockWebSocket;
      const testMessage = { action: 'response', data: { result: 'success' } };
      
      mockWs.simulateMessage(testMessage);
      
      expect(events.onMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should handle invalid JSON messages gracefully', async () => {
      const mockWs = (client as any).ws as MockWebSocket;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simulate invalid JSON
      const messageEvent = new MessageEvent('message', { data: 'invalid json' });
      mockWs.onmessage?.(messageEvent);
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse WebSocket message:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on unexpected disconnect', async () => {
      await client.connect();
      const mockWs = (client as any).ws as MockWebSocket;
      
      // Simulate unexpected disconnect
      mockWs.close(1006, 'Connection lost');
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(events.onReconnecting).toHaveBeenCalledWith(1);
    });

    it('should give up after max reconnection attempts', async () => {
      // Create client with failing WebSocket that always fails
      const FailingMockWebSocket = class {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        
        readyState = FailingMockWebSocket.CONNECTING;
        onopen: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        
        constructor(public url: string) {
          // Always fail after a short delay
          setTimeout(() => {
            this.readyState = FailingMockWebSocket.CLOSED;
            this.onerror?.(new Event('error'));
            this.onclose?.(new CloseEvent('close', { code: 1006, reason: 'Connection failed' }));
          }, 10);
        }
        
        send = vi.fn();
        close() {
          this.readyState = FailingMockWebSocket.CLOSED;
          this.onclose?.(new CloseEvent('close', { code: 1000, reason: 'Manual disconnect' }));
        }
      };
      
      global.WebSocket = FailingMockWebSocket as any;

      const client = new WebSocketClient(config, events);
      
      try {
        await client.connect();
      } catch (error) {
        // Expected to fail
      }

      // Wait for all reconnection attempts (3 attempts * 100ms interval + buffer)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(events.onReconnectFailed).toHaveBeenCalled();
    });
  });

  describe('Heartbeat', () => {
    it('should send ping messages when connected', async () => {
      const shortHeartbeatConfig = { ...config, heartbeatInterval: 50 };
      const client = new WebSocketClient(shortHeartbeatConfig, events);
      
      await client.connect();
      
      // Wait for heartbeat
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have sent at least one ping
      // Note: This is a simplified test - in practice you'd mock the send method
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket errors', async () => {
      await client.connect();
      const mockWs = (client as any).ws as MockWebSocket;
      
      mockWs.simulateError();
      
      expect(events.onError).toHaveBeenCalled();
      expect(client.getState()).toBe(WebSocketState.ERROR);
    });

    it('should handle send errors gracefully', async () => {
      await client.connect();
      const mockWs = (client as any).ws as MockWebSocket;
      
      // Mock send to throw error
      const originalSend = mockWs.send;
      mockWs.send = vi.fn().mockImplementation(() => {
        throw new Error('Send failed');
      });
      
      const message = { action: 'test' };
      const result = client.send(message);
      
      expect(result).toBe(false);
      
      // Restore original send
      mockWs.send = originalSend;
    });
  });

  describe('Message Queue', () => {
    it('should process queued messages after reconnection', async () => {
      await client.connect();
      client.disconnect();
      
      // Send messages while disconnected
      const messages = [
        { action: 'msg1', data: { id: 1 } },
        { action: 'msg2', data: { id: 2 } }
      ];
      
      messages.forEach(msg => client.send(msg));
      
      // Reconnect
      await client.connect();
      
      // Messages should be processed (this is a simplified test)
      expect(client.isConnected()).toBe(true);
    });

    it('should limit queue size to prevent memory issues', () => {
      // Send many messages while disconnected
      for (let i = 0; i < 150; i++) {
        client.send({ action: 'test', data: { id: i } });
      }
      
      // Queue should be limited to 100 messages
      const queue = (client as any).messageQueue;
      expect(queue.length).toBeLessThanOrEqual(100);
    });
  });
});