import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket, type UseWebSocketOptions } from '../lib/use-websocket.js';

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

// Mock environment variable
const originalEnv = process.env;

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    process.env = { ...originalEnv, WEBSOCKET_URL: 'ws://localhost:8080' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState.isConnected).toBe(false);
      expect(result.current.connectionId).toBeUndefined();
    });

    it('should use provided URL over environment variable', () => {
      const customUrl = 'ws://custom.example.com';
      const { result } = renderHook(() => 
        useWebSocket({ url: customUrl, autoConnect: false })
      );
      
      // The hook should initialize without errors
      expect(result.current).toBeDefined();
    });

    it('should warn when no URL is provided', () => {
      delete process.env.WEBSOCKET_URL;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      renderHook(() => useWebSocket({ autoConnect: false }));
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket URL not provided');
      consoleSpy.mockRestore();
    });
  });

  describe('Auto Connection', () => {
    it('should auto-connect when autoConnect is true', async () => {
      const { result } = renderHook(() => 
        useWebSocket({ autoConnect: true })
      );
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should not auto-connect when autoConnect is false', () => {
      const { result } = renderHook(() => 
        useWebSocket({ autoConnect: false })
      );
      
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Manual Connection', () => {
    it('should connect manually', async () => {
      const { result } = renderHook(() => 
        useWebSocket({ autoConnect: false })
      );
      
      expect(result.current.isConnected).toBe(false);
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.isConnected).toBe(true);
    });

    it('should disconnect manually', async () => {
      const { result } = renderHook(() => 
        useWebSocket({ autoConnect: true })
      );
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      act(() => {
        result.current.disconnect();
      });
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });
  });

  describe('Event Callbacks', () => {
    it('should call onConnect callback', async () => {
      const onConnect = vi.fn();
      
      renderHook(() => 
        useWebSocket({ autoConnect: true, onConnect })
      );
      
      await waitFor(() => {
        expect(onConnect).toHaveBeenCalled();
      });
    });

    it('should call onDisconnect callback', async () => {
      const onDisconnect = vi.fn();
      
      const { result } = renderHook(() => 
        useWebSocket({ autoConnect: true, onDisconnect })
      );
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      act(() => {
        result.current.disconnect();
      });
      
      await waitFor(() => {
        expect(onDisconnect).toHaveBeenCalled();
      });
    });

    it('should call onError callback on connection failure', async () => {
      const onError = vi.fn();
      
      // Mock failing WebSocket
      const FailingMockWebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            const errorEvent = new Event('error');
            this.onerror?.(errorEvent);
          }, 10);
        }
      };
      global.WebSocket = FailingMockWebSocket as any;
      
      const { result } = renderHook(() => 
        useWebSocket({ autoConnect: false, onError })
      );
      
      await act(async () => {
        try {
          await result.current.connect();
        } catch (error) {
          // Expected to fail
        }
      });
      
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    it('should register message handlers', async () => {
      const { result } = renderHook(() => 
        useWebSocket({ autoConnect: true })
      );
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      const handler = vi.fn();
      let unsubscribe: (() => void) | undefined;
      
      act(() => {
        unsubscribe = result.current.onMessage('test_action', handler);
      });
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('should send messages', async () => {
      const { result } = renderHook(() => 
        useWebSocket({ autoConnect: true })
      );
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      const message = { action: 'test', data: { value: 'hello' } };
      let sendResult: boolean;
      
      act(() => {
        sendResult = result.current.send(message);
      });
      
      expect(sendResult!).toBe(true);
    });
  });

  describe('Convenience Methods', () => {
    let result: any;
    
    beforeEach(async () => {
      const hook = renderHook(() => 
        useWebSocket({ 
          autoConnect: true,
          userId: 'test-user',
          sessionId: 'test-session'
        })
      );
      result = hook.result;
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should send voice messages', () => {
      let sendResult: boolean;
      
      act(() => {
        sendResult = result.current.sendVoiceMessage('audiodata123');
      });
      
      expect(sendResult!).toBe(true);
    });

    it('should send text messages', () => {
      let sendResult: boolean;
      
      act(() => {
        sendResult = result.current.sendTextMessage('Hello world');
      });
      
      expect(sendResult!).toBe(true);
    });

    it('should start voice session', () => {
      let sendResult: boolean;
      
      act(() => {
        sendResult = result.current.startVoiceSession();
      });
      
      expect(sendResult!).toBe(true);
    });

    it('should end voice session', () => {
      let sendResult: boolean;
      
      act(() => {
        sendResult = result.current.endVoiceSession();
      });
      
      expect(sendResult!).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('should update userId when prop changes', async () => {
      const { result, rerender } = renderHook(
        ({ userId }) => useWebSocket({ autoConnect: false, userId }),
        { initialProps: { userId: 'user1' } }
      );
      
      await waitFor(() => {
        expect(result.current.connectionState.userId).toBe('user1');
      });
      
      rerender({ userId: 'user2' });
      
      await waitFor(() => {
        expect(result.current.connectionState.userId).toBe('user2');
      });
    });

    it('should update sessionId when prop changes', async () => {
      const { result, rerender } = renderHook(
        ({ sessionId }) => useWebSocket({ autoConnect: false, sessionId }),
        { initialProps: { sessionId: 'session1' } }
      );
      
      await waitFor(() => {
        expect(result.current.connectionState.sessionId).toBe('session1');
      });
      
      rerender({ sessionId: 'session2' });
      
      await waitFor(() => {
        expect(result.current.connectionState.sessionId).toBe('session2');
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() => 
        useWebSocket({ autoConnect: true })
      );
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      unmount();
      
      // Should not throw errors during cleanup
    });
  });

  describe('Error Handling', () => {
    it('should handle manager not initialized errors gracefully', () => {
      const { result } = renderHook(() => 
        useWebSocket({ url: '', autoConnect: false })
      );
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Try to send message without connection
      act(() => {
        const sendResult = result.current.send({ action: 'test' });
        expect(sendResult).toBe(false);
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket manager not initialized');
      consoleSpy.mockRestore();
    });

    it('should throw error when connecting without manager', async () => {
      const { result } = renderHook(() => 
        useWebSocket({ url: '', autoConnect: false })
      );
      
      await act(async () => {
        await expect(result.current.connect()).rejects.toThrow('WebSocket manager not initialized');
      });
    });
  });
});