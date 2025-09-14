import { useEffect, useRef, useState, useCallback } from 'react';
import { subscriptionManager, type EventHandler, type SubscriptionOptions } from './subscription-manager';
import type { 
  AppSyncEvent, 
  VoiceSessionEvent, 
  ChatEvent, 
  UIControlEvent 
} from '@airium/shared';

/**
 * React Hooks for AppSync GraphQL Subscriptions
 * 
 * These hooks provide easy-to-use interfaces for managing GraphQL subscriptions
 * in React components with proper lifecycle management.
 */

export interface UseSubscriptionResult {
  isConnected: boolean;
  error: Error | null;
  subscriptionId: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * Base hook for managing subscription lifecycle
 */
function useSubscription<T = any>(
  subscribeFunction: (options: SubscriptionOptions) => string,
  dependencies: any[] = []
): UseSubscriptionResult & { data: T | null } {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);

  const handleEvent: EventHandler<T> = useCallback((eventData: T) => {
    setData(eventData);
    setError(null);
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err);
    setIsConnected(false);
  }, []);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    setError(null);
  }, []);

  const handleDisconnected = useCallback(() => {
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!subscriptionManager.isReady()) {
      subscriptionManager.initialize();
    }

    try {
      const subscriptionId = subscribeFunction({
        onEvent: handleEvent,
        onError: handleError,
        onConnected: handleConnected,
        onDisconnected: handleDisconnected,
        autoReconnect: true,
        maxRetries: 3,
        retryDelay: 1000
      });

      subscriptionIdRef.current = subscriptionId;
    } catch (err) {
      setError(err as Error);
    }
  }, [subscribeFunction, handleEvent, handleError, handleConnected, handleDisconnected]);

  const disconnect = useCallback(() => {
    if (subscriptionIdRef.current) {
      subscriptionManager.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
      setIsConnected(false);
      setData(null);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    return disconnect;
  }, dependencies);

  return {
    isConnected,
    error,
    data,
    subscriptionId: subscriptionIdRef.current,
    reconnect,
    disconnect
  };
}

/**
 * Hook for subscribing to general events
 */
export function useEventSubscription(userId: string) {
  const subscribeFunction = useCallback(
    (options: SubscriptionOptions) => subscriptionManager.subscribeToEvents(userId, options),
    [userId]
  );

  return useSubscription<AppSyncEvent>(subscribeFunction, [userId]);
}

/**
 * Hook for subscribing to voice session events
 */
export function useVoiceSessionSubscription(sessionId: string) {
  const subscribeFunction = useCallback(
    (options: SubscriptionOptions) => subscriptionManager.subscribeToVoiceSession(sessionId, options),
    [sessionId]
  );

  return useSubscription<VoiceSessionEvent>(subscribeFunction, [sessionId]);
}

/**
 * Hook for subscribing to chat events
 */
export function useChatSubscription(userId: string) {
  const subscribeFunction = useCallback(
    (options: SubscriptionOptions) => subscriptionManager.subscribeToChat(userId, options),
    [userId]
  );

  return useSubscription<ChatEvent>(subscribeFunction, [userId]);
}

/**
 * Hook for subscribing to UI control events
 */
export function useUIControlSubscription(userId: string) {
  const subscribeFunction = useCallback(
    (options: SubscriptionOptions) => subscriptionManager.subscribeToUIControl(userId, options),
    [userId]
  );

  return useSubscription<UIControlEvent>(subscribeFunction, [userId]);
}

/**
 * Hook for subscribing to notes events
 */
export function useNotesSubscription(userId: string) {
  const subscribeFunction = useCallback(
    (options: SubscriptionOptions) => subscriptionManager.subscribeToNotes(userId, options),
    [userId]
  );

  return useSubscription(subscribeFunction, [userId]);
}

/**
 * Hook for managing multiple subscriptions for a user
 */
export function useUserSubscriptions(userId: string) {
  const eventSubscription = useEventSubscription(userId);
  const chatSubscription = useChatSubscription(userId);
  const uiControlSubscription = useUIControlSubscription(userId);
  const notesSubscription = useNotesSubscription(userId);

  const isConnected = eventSubscription.isConnected && 
                     chatSubscription.isConnected && 
                     uiControlSubscription.isConnected && 
                     notesSubscription.isConnected;

  const hasError = eventSubscription.error || 
                   chatSubscription.error || 
                   uiControlSubscription.error || 
                   notesSubscription.error;

  const reconnectAll = useCallback(() => {
    eventSubscription.reconnect();
    chatSubscription.reconnect();
    uiControlSubscription.reconnect();
    notesSubscription.reconnect();
  }, [eventSubscription, chatSubscription, uiControlSubscription, notesSubscription]);

  const disconnectAll = useCallback(() => {
    eventSubscription.disconnect();
    chatSubscription.disconnect();
    uiControlSubscription.disconnect();
    notesSubscription.disconnect();
  }, [eventSubscription, chatSubscription, uiControlSubscription, notesSubscription]);

  return {
    isConnected,
    error: hasError,
    events: {
      general: eventSubscription.data,
      chat: chatSubscription.data,
      uiControl: uiControlSubscription.data,
      notes: notesSubscription.data
    },
    subscriptions: {
      event: eventSubscription,
      chat: chatSubscription,
      uiControl: uiControlSubscription,
      notes: notesSubscription
    },
    reconnectAll,
    disconnectAll
  };
}

/**
 * Hook for subscription manager status
 */
export function useSubscriptionManager() {
  const [isReady, setIsReady] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const checkStatus = () => {
      setIsReady(subscriptionManager.isReady());
      setActiveCount(subscriptionManager.getActiveSubscriptions().length);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const initialize = useCallback(() => {
    try {
      subscriptionManager.initialize();
      setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize subscription manager:', error);
    }
  }, []);

  const cleanup = useCallback(() => {
    subscriptionManager.cleanup();
    setIsReady(false);
    setActiveCount(0);
  }, []);

  return {
    isReady,
    activeCount,
    initialize,
    cleanup,
    manager: subscriptionManager
  };
}