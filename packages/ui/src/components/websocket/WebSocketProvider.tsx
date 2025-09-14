import React, { createContext, useContext, type ReactNode } from 'react';
import { useWebSocket, type UseWebSocketOptions, type UseWebSocketReturn } from '../../lib/use-websocket.js';

interface WebSocketContextValue extends UseWebSocketReturn {
  // Additional context-specific methods can be added here
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export interface WebSocketProviderProps extends UseWebSocketOptions {
  children: ReactNode;
}

export function WebSocketProvider({ children, ...options }: WebSocketProviderProps) {
  const websocket = useWebSocket(options);

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  
  return context;
}

// Export the context for advanced use cases
export { WebSocketContext };