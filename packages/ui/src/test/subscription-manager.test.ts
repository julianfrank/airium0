import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { subscriptionManager } from '../lib/subscription-manager';
import type { SubscriptionOptions } from '../lib/subscription-manager';

// Mock AppSync client
const mockSubscription = {
  subscribe: vi.fn(),
  unsubscribe: vi.fn()
};

const mockClient = {
  graphql: vi.fn(() => mockSubscription)
};

vi.mock('../lib/appsync-client', () => ({
  getAppSyncClient: vi.fn(() => mockClient),
  isAppSyncClientReady: vi.fn(() => true)
}));

describe('Subscription Manager', () => {
  beforeEach(() => {
    subscriptionManager.cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    subscriptionManager.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      subscriptionManager.initialize();
      expect(subscriptionManager.isReady()).toBe(true);
    });

    it('should throw error when AppSync client is not ready', () => {
      const { isAppSyncClientReady } = require('../lib/appsync-client');
      isAppSyncClientReady.mockReturnValueOnce(false);

      expect(() => subscriptionManager.initialize()).toThrow('AppSync client is not ready');
    });
  });

  describe('Event Subscriptions', () => {
    beforeEach(() => {
      subscriptionManager.initialize();
    });

    it('should create event subscription', () => {
      const userId = 'test-user-123';
      const options: SubscriptionOptions = {
        onEvent: vi.fn(),
        onError: vi.fn(),
        onConnected: vi.fn()
      };

      const subscriptionId = subscriptionManager.subscribeToEvents(userId, options);

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^events_/);
      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: expect.any(Object),
        variables: { userId }
      });
    });

    it('should create voice session subscription', () => {
      const sessionId = 'session-123';
      const options: SubscriptionOptions = {
        onEvent: vi.fn()
      };

      const subscriptionId = subscriptionManager.subscribeToVoiceSession(sessionId, options);

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^voice_session_/);
      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: expect.any(Object),
        variables: { sessionId }
      });
    });

    it('should create chat subscription', () => {
      const userId = 'test-user-123';
      
      const subscriptionId = subscriptionManager.subscribeToChat(userId);

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^chat_/);
    });

    it('should create UI control subscription', () => {
      const userId = 'test-user-123';
      
      const subscriptionId = subscriptionManager.subscribeToUIControl(userId);

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^ui_control_/);
    });

    it('should create notes subscription', () => {
      const userId = 'test-user-123';
      
      const subscriptionId = subscriptionManager.subscribeToNotes(userId);

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^notes_/);
    });
  });

  describe('Subscription Management', () => {
    let subscriptionId: string;

    beforeEach(() => {
      subscriptionManager.initialize();
      subscriptionId = subscriptionManager.subscribeToEvents('test-user');
    });

    it('should track active subscriptions', () => {
      const activeSubscriptions = subscriptionManager.getActiveSubscriptions();
      
      expect(activeSubscriptions).toHaveLength(1);
      expect(activeSubscriptions[0].id).toBe(subscriptionId);
      expect(activeSubscriptions[0].isActive).toBe(true);
    });

    it('should get subscription by ID', () => {
      const subscription = subscriptionManager.getSubscription(subscriptionId);
      
      expect(subscription).toBeDefined();
      expect(subscription?.id).toBe(subscriptionId);
      expect(subscription?.type).toBe('events');
    });

    it('should unsubscribe successfully', () => {
      const result = subscriptionManager.unsubscribe(subscriptionId);
      
      expect(result).toBe(true);
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
      expect(subscriptionManager.getActiveSubscriptions()).toHaveLength(0);
    });

    it('should handle unsubscribe for non-existent subscription', () => {
      const result = subscriptionManager.unsubscribe('non-existent');
      
      expect(result).toBe(false);
    });

    it('should unsubscribe all subscriptions', () => {
      // Create multiple subscriptions
      subscriptionManager.subscribeToChat('user-1');
      subscriptionManager.subscribeToUIControl('user-1');
      
      expect(subscriptionManager.getActiveSubscriptions()).toHaveLength(3);
      
      subscriptionManager.unsubscribeAll();
      
      expect(subscriptionManager.getActiveSubscriptions()).toHaveLength(0);
    });
  });

  describe('Event Handling', () => {
    let onEvent: ReturnType<typeof vi.fn>;
    let onError: ReturnType<typeof vi.fn>;
    let onConnected: ReturnType<typeof vi.fn>;
    let subscriptionId: string;

    beforeEach(() => {
      subscriptionManager.initialize();
      onEvent = vi.fn();
      onError = vi.fn();
      onConnected = vi.fn();

      subscriptionId = subscriptionManager.subscribeToEvents('test-user', {
        onEvent,
        onError,
        onConnected
      });
    });

    it('should call onConnected when subscription is created', () => {
      expect(onConnected).toHaveBeenCalled();
    });

    it('should handle subscription events', () => {
      const eventData = { id: '1', type: 'test', payload: { message: 'test' } };
      
      // Simulate subscription event
      const subscribeCall = mockSubscription.subscribe.mock.calls[0][0];
      subscribeCall.next({ data: { onEvent: eventData } });

      expect(onEvent).toHaveBeenCalledWith(eventData);
    });

    it('should handle subscription errors', () => {
      const error = new Error('Connection failed');
      
      // Simulate subscription error
      const subscribeCall = mockSubscription.subscribe.mock.calls[0][0];
      subscribeCall.error(error);

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should handle subscription completion', () => {
      const onDisconnected = vi.fn();
      
      // Create subscription with disconnect handler
      const newSubscriptionId = subscriptionManager.subscribeToEvents('test-user-2', {
        onDisconnected
      });

      // Simulate subscription completion
      const subscribeCall = mockSubscription.subscribe.mock.calls[1][0];
      subscribeCall.complete();

      expect(onDisconnected).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    let onError: ReturnType<typeof vi.fn>;
    let subscriptionId: string;

    beforeEach(() => {
      subscriptionManager.initialize();
      onError = vi.fn();

      subscriptionId = subscriptionManager.subscribeToEvents('test-user', {
        onError,
        autoReconnect: true,
        maxRetries: 2,
        retryDelay: 100
      });
    });

    it('should attempt reconnection on error', async () => {
      const error = new Error('Network error');
      
      // Simulate subscription error
      const subscribeCall = mockSubscription.subscribe.mock.calls[0][0];
      subscribeCall.error(error);

      expect(onError).toHaveBeenCalledWith(error);

      // Wait for retry attempt
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have created a new subscription (retry)
      expect(mockClient.graphql).toHaveBeenCalledTimes(2);
    });

    it('should stop retrying after max attempts', async () => {
      const error = new Error('Persistent error');
      
      // Simulate multiple errors
      for (let i = 0; i < 3; i++) {
        const subscribeCall = mockSubscription.subscribe.mock.calls[i][0];
        subscribeCall.error(error);
        
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }

      expect(onError).toHaveBeenCalledTimes(3);
      
      // Should not create more subscriptions after max retries
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(mockClient.graphql).toHaveBeenCalledTimes(3); // Original + 2 retries
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all subscriptions and reset state', () => {
      subscriptionManager.initialize();
      
      // Create multiple subscriptions
      subscriptionManager.subscribeToEvents('user-1');
      subscriptionManager.subscribeToChat('user-1');
      
      expect(subscriptionManager.getActiveSubscriptions()).toHaveLength(2);
      expect(subscriptionManager.isReady()).toBe(true);
      
      subscriptionManager.cleanup();
      
      expect(subscriptionManager.getActiveSubscriptions()).toHaveLength(0);
      expect(subscriptionManager.isReady()).toBe(false);
    });
  });
});