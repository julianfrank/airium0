import React from 'react';
import { useWebSocketContext } from './WebSocketProvider.js';
import { WebSocketState } from '../../lib/websocket-client.js';

export interface WebSocketStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function WebSocketStatus({ showDetails = false, className = '' }: WebSocketStatusProps) {
  const { connectionState, connect, disconnect } = useWebSocketContext();

  const getStatusColor = (state: string): string => {
    switch (state) {
      case WebSocketState.CONNECTED:
        return 'text-green-600';
      case WebSocketState.CONNECTING:
      case WebSocketState.RECONNECTING:
        return 'text-yellow-600';
      case WebSocketState.DISCONNECTED:
        return 'text-gray-600';
      case WebSocketState.ERROR:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (state: string): string => {
    switch (state) {
      case WebSocketState.CONNECTED:
        return '🟢';
      case WebSocketState.CONNECTING:
      case WebSocketState.RECONNECTING:
        return '🟡';
      case WebSocketState.DISCONNECTED:
        return '⚫';
      case WebSocketState.ERROR:
        return '🔴';
      default:
        return '⚫';
    }
  };

  const getStatusText = (state: string): string => {
    switch (state) {
      case WebSocketState.CONNECTED:
        return 'Connected';
      case WebSocketState.CONNECTING:
        return 'Connecting...';
      case WebSocketState.RECONNECTING:
        return `Reconnecting... (${connectionState.reconnectAttempts})`;
      case WebSocketState.DISCONNECTED:
        return 'Disconnected';
      case WebSocketState.ERROR:
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const handleToggleConnection = async () => {
    if (connectionState.isConnected) {
      disconnect();
    } else {
      try {
        await connect();
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm">
        {getStatusIcon(connectionState.state)}
      </span>
      
      <span className={`text-sm font-medium ${getStatusColor(connectionState.state)}`}>
        {getStatusText(connectionState.state)}
      </span>

      {showDetails && (
        <>
          <button
            onClick={handleToggleConnection}
            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            disabled={connectionState.state === WebSocketState.CONNECTING || connectionState.state === WebSocketState.RECONNECTING}
          >
            {connectionState.isConnected ? 'Disconnect' : 'Connect'}
          </button>

          {connectionState.connectionId && (
            <span className="text-xs text-gray-500">
              ID: {connectionState.connectionId.slice(-8)}
            </span>
          )}

          {connectionState.lastConnected && (
            <span className="text-xs text-gray-500">
              Last: {connectionState.lastConnected.toLocaleTimeString()}
            </span>
          )}
        </>
      )}
    </div>
  );
}