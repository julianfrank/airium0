import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useEventSubscription, 
  useVoiceSessionSubscription,
  useChatSubscription,
  useUIControlSubscription,
  useNotesSubscription,
  useUserSubscriptions,
  useSubscriptionManager
} from '../lib/use-appsync-subscriptions';

// Mock subscription manager
const mockSubscriptionManager = {
  isReady: vi.fn(() => true),
  initialize: vi.fn(),
  cleanup: vi.fn(),
  subscribeToEvents: vi.fn(() => 'events-sub-123'),
  subscribeToVoiceSession: vi.fn(() => 'voice-sub-123'),
  subscribeToChat: vi.fn(() => 'chat-sub-123'),
  subscribeToUIControl: vi.fn(() => 'ui-sub-123'),
  subscribeToNotes: vi.fn(() => 'notes-sub-123'),
  unsubscribe: vi.fn(() => true),
  getActiveSubscriptions: vi.fn(() => [])
};

vi.mock('../lib/subscription-manager', () => ({
  subscriptionManager: mockSubscriptionManager
}));

describe('AppSync Subscription Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEventSubscription', () => {
    it('should create event subscription on mount', () => {
      const userId = 'test-user-123';
      
      const { result } = renderHook(() => useEventSubscription(userId));

      expect(mockSubscriptionManager.subscribeToEvents).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          onEvent: expect.any(Function),
          onError: expect.any(Function),
          onConnected: expect.any(Function),
          onDisconnected: expect.any(Function),
          autoReconnect: true,
          maxRetries: 3,
          retryDelay: 1000
        })
      );

      expect(result.current.subscriptionId).toBe('events-sub-123');
      expect(result.current.isConnected).toBe(false); // Initially false until connected
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should handle connection state changes', () => {
      const { result } = renderHook(() => useEventSubscription('test-user'));

      // Simulate connection
      const subscribeCall = mockSubscriptionManager.subscribeToEvents.mock.calls[0][1];
      act(() => {
        subscribeCall.onConnected();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should handle incoming events', () => {
      const { result } = renderHook(() => useEventSubscription('test-user'));

      const eventData = { id: '1', type: 'test', payload: { message: 'hello' } };
      const subscribeCall = mockSubscriptionManager.subscribeToEvents.mock.calls[0][1];
      
      act(() => {
        subscribeCall.onEvent(eventData);
      });

      expect(result.current.data).toEqual(eventData);
    });

    it('should handle errors', () => {
      const { result } = renderHook(() => useEventSubscription('test-user'));

      const error = new Error('Connection failed');
      const subscribeCall = mockSubscriptionManager.subscribeToEvents.mock.calls[0][1];
      
      act(() => {
        subscribeCall.onError(error);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.isConnected).toBe(false);
    });

    it('should cleanup subscription on unmount', () => {
      const { unmount } = renderHook(() => useEventSubscription('test-user'));

      unmount();

      expect(mockSubscriptionManager.unsubscribe).toHaveBeenCalledWith('events-sub-123');
    });
  });

  describe('useVoiceSessionSubscription', () => {
    it('should create voice session subscription', () => {
      const sessionId = 'session-123';
      
      renderHook(() => useVoiceSessionSubscription(sessionId));

      expect(mockSubscriptionManager.subscribeToVoiceSession).toHaveBeenCalledWith(
        sessionId,
        expect.any(Object)
      );
    });
  });

  describe('useChatSubscription', () => {
    it('should create chat subscription', () => {
      const userId = 'user-123';
      
      renderHook(() => useChatSubscription(userId));

      expect(mockSubscriptionManager.subscribeToChat).toHaveBeenCalledWith(
        userId,
        expect.any(Object)
      );
    });
  });

  describe('useUIControlSubscription', () => {
    it('should create UI control subscription', () => {
      const userId = 'user-123';
      
      renderHook(() => useUIControlSubscription(userId));

      expect(mockSubscriptionManager.subscribeToUIControl).toHaveBeenCalledWith(
        userId,
        expect.any(Object)
      );
    });
  });

  describe('useNotesSubscription', () => {
    it('should create notes subscription', () => {
      const userId = 'user-123';
      
      renderHook(() => useNotesSubscription(userId));

      expect(mockSubscriptionManager.subscribeToNotes).toHaveBeenCalledWith(
        userId,
        expect.any(Object)
      );
    });
  });

  describe('useUserSubscriptions', () => {
    it('should create all user subscriptions', () => {
      const userId = 'user-123';
      
      const { result } = renderHook(() => useUserSubscriptions(userId));

      expect(mockSubscriptionManager.subscribeToEvents).toHaveBeenCalledWith(userId, expect.any(Object));
      expect(mockSubscriptionManager.subscribeToChat).toHaveBeenCalledWith(userId, expect.any(Object));
      expect(mockSubscriptionManager.subscribeToUIControl).toHaveBeenCalledWith(userId, expect.any(Object));
      expect(mockSubscriptionManager.subscribeToNotes).toHaveBeenCalledWith(userId, expect.any(Object));

      expect(result.current.events).toEqual({
        general: null,
        chat: null,
        uiControl: null,
        notes: null
      });

      expect(result.current.subscriptions).toHaveProperty('event');
      expect(result.current.subscriptions).toHaveProperty('chat');
      expect(result.current.subscriptions).toHaveProperty('uiControl');
      expect(result.current.subscriptions).toHaveProperty('notes');
    });

    it('should provide reconnectAll function', () => {
      const { result } = renderHook(() => useUserSubscriptions('user-123'));

      expect(result.current.reconnectAll).toBeInstanceOf(Function);
      expect(result.current.disconnectAll).toBeInstanceOf(Function);
    });

    it('should aggregate connection status', () => {
      const { result } = renderHook(() => useUserSubscriptions('user-123'));

      // Initially all disconnected
      expect(result.current.isConnected).toBe(false);

      // Simulate all connections
      const eventCall = mockSubscriptionManager.subscribeToEvents.mock.calls[0][1];
      const chatCall = mockSubscriptionManager.subscribeToChat.mock.calls[0][1];
      const uiCall = mockSubscriptionManager.subscribeToUIControl.mock.calls[0][1];
      const notesCall = mockSubscriptionManager.subscribeToNotes.mock.calls[0][1];

      act(() => {
        eventCall.onConnected();
        chatCall.onConnected();
        uiCall.onConnected();
        notesCall.onConnected();
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('useSubscriptionManager', () => {
    it('should provide manager status and controls', () => {
      const { result } = renderHook(() => useSubscriptionManager());

      expect(result.current.isReady).toBe(true);
      expect(result.current.activeCount).toBe(0);
      expect(result.current.initialize).toBeInstanceOf(Function);
      expect(result.current.cleanup).toBeInstanceOf(Function);
      expect(result.current.manager).toBe(mockSubscriptionManager);
    });

    it('should initialize manager', () => {
      const { result } = renderHook(() => useSubscriptionManager());

      act(() => {
        result.current.initialize();
      });

      expect(mockSubscriptionManager.initialize).toHaveBeenCalled();
    });

    it('should cleanup manager', () => {
      const { result } = renderHook(() => useSubscriptionManager());

      act(() => {
        result.current.cleanup();
      });

      expect(mockSubscriptionManager.cleanup).toHaveBeenCalled();
    });
  });

  describe('Hook Dependencies', () => {
    it('should recreate subscription when userId changes', () => {
      const { rerender } = renderHook(
        ({ userId }) => useEventSubscription(userId),
        { initialProps: { userId: 'user-1' } }
      );

      expect(mockSubscriptionManager.subscribeToEvents).toHaveBeenCalledTimes(1);
      expect(mockSubscriptionManager.subscribeToEvents).toHaveBeenCalledWith('user-1', expect.any(Object));

      rerender({ userId: 'user-2' });

      expect(mockSubscriptionManager.subscribeToEvents).toHaveBeenCalledTimes(2);
      expect(mockSubscriptionManager.subscribeToEvents).toHaveBeenLastCalledWith('user-2', expect.any(Object));
      expect(mockSubscriptionManager.unsubscribe).toHaveBeenCalledWith('events-sub-123');
    });

    it('should recreate voice session subscription when sessionId changes', () => {
      const { rerender } = renderHook(
        ({ sessionId }) => useVoiceSessionSubscription(sessionId),
        { initialProps: { sessionId: 'session-1' } }
      );

      expect(mockSubscriptionManager.subscribeToVoiceSession).toHaveBeenCalledTimes(1);

      rerender({ sessionId: 'session-2' });

      expect(mockSubscriptionManager.subscribeToVoiceSession).toHaveBeenCalledTimes(2);
      expect(mockSubscriptionManager.unsubscribe).toHaveBeenCalled();
    });
  });
});