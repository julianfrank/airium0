import { useEffect, useRef, useState, useCallback } from 'react';
import { ConnectionManager, type ConnectionManagerConfig, type ConnectionState, type MessageHandler } from './connection-manager.js';
import type { WebSocketMessage } from '@airium/shared/types';

export interface UseWebSocketOptions extends Omit<ConnectionManagerConfig, 'url'> {
  url?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export interface UseWebSocketReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  connectionId?: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (message: WebSocketMessage) => boolean;
  sendVoiceMessage: (audioData: string, sessionId?: string) => boolean;
  sendTextMessage: (text: string, sessionId?: string) => boolean;
  startVoiceSession: () => boolean;
  endVoiceSession: (sessionId?: string) => boolean;
  onMessage: (action: string, handler: MessageHandler) => () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = process.env.WEBSOCKET_URL || '',
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
    ...config
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    reconnectAttempts: 0,
    state: 'DISCONNECTED' as any
  });

  const managerRef = useRef<ConnectionManager | null>(null);
  const handlersRef = useRef<(() => void)[]>([]);

  // Initialize connection manager
  useEffect(() => {
    if (!url) {
      console.warn('WebSocket URL not provided');
      return;
    }

    const manager = new ConnectionManager({
      url,
      ...config
    });

    // Subscribe to connection state changes
    const unsubscribeState = manager.onConnectionStateChange((state) => {
      setConnectionState(state);
      
      if (state.isConnected && !connectionState.isConnected) {
        onConnect?.();
      } else if (!state.isConnected && connectionState.isConnected) {
        onDisconnect?.();
      }
    });

    managerRef.current = manager;
    handlersRef.current.push(unsubscribeState);

    // Auto-connect if enabled
    if (autoConnect) {
      manager.connect().catch(onError);
    }

    return () => {
      // Clean up all handlers
      handlersRef.current.forEach(cleanup => cleanup());
      handlersRef.current = [];
      
      // Disconnect and clean up manager
      manager.disconnect();
      managerRef.current = null;
    };
  }, [url, autoConnect]);

  // Update manager configuration when options change
  useEffect(() => {
    if (managerRef.current && config.userId) {
      managerRef.current.setUserId(config.userId);
    }
  }, [config.userId]);

  useEffect(() => {
    if (managerRef.current && config.sessionId) {
      managerRef.current.setSessionId(config.sessionId);
    }
  }, [config.sessionId]);

  const connect = useCallback(async () => {
    if (!managerRef.current) {
      throw new Error('WebSocket manager not initialized');
    }
    
    try {
      await managerRef.current.connect();
    } catch (error) {
      onError?.(error);
      throw error;
    }
  }, [onError]);

  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
    }
  }, []);

  const send = useCallback((message: WebSocketMessage): boolean => {
    if (!managerRef.current) {
      console.warn('WebSocket manager not initialized');
      return false;
    }
    return managerRef.current.send(message);
  }, []);

  const sendVoiceMessage = useCallback((audioData: string, sessionId?: string): boolean => {
    if (!managerRef.current) {
      console.warn('WebSocket manager not initialized');
      return false;
    }
    return managerRef.current.sendVoiceMessage(audioData, sessionId);
  }, []);

  const sendTextMessage = useCallback((text: string, sessionId?: string): boolean => {
    if (!managerRef.current) {
      console.warn('WebSocket manager not initialized');
      return false;
    }
    return managerRef.current.sendTextMessage(text, sessionId);
  }, []);

  const startVoiceSession = useCallback((): boolean => {
    if (!managerRef.current) {
      console.warn('WebSocket manager not initialized');
      return false;
    }
    return managerRef.current.startVoiceSession();
  }, []);

  const endVoiceSession = useCallback((sessionId?: string): boolean => {
    if (!managerRef.current) {
      console.warn('WebSocket manager not initialized');
      return false;
    }
    return managerRef.current.endVoiceSession(sessionId);
  }, []);

  const onMessage = useCallback((action: string, handler: MessageHandler): (() => void) => {
    if (!managerRef.current) {
      console.warn('WebSocket manager not initialized');
      return () => {};
    }
    
    const unsubscribe = managerRef.current.onMessage(action, handler);
    handlersRef.current.push(unsubscribe);
    
    return () => {
      unsubscribe();
      const index = handlersRef.current.indexOf(unsubscribe);
      if (index > -1) {
        handlersRef.current.splice(index, 1);
      }
    };
  }, []);

  return {
    connectionState,
    isConnected: connectionState.isConnected,
    connectionId: connectionState.connectionId,
    connect,
    disconnect,
    send,
    sendVoiceMessage,
    sendTextMessage,
    startVoiceSession,
    endVoiceSession,
    onMessage
  };
}