import React, { useEffect, useState } from 'react';
import { 
  useUserSubscriptions, 
  useSubscriptionManager,
  type UseSubscriptionResult 
} from '../../lib/use-appsync-subscriptions';
import type { 
  AppSyncEvent, 
  VoiceSessionEvent, 
  ChatEvent, 
  UIControlEvent 
} from '@airium/shared';

/**
 * Real-time Event Handling Components
 * 
 * These components provide UI for managing and displaying real-time events
 * from AppSync GraphQL subscriptions.
 */

export interface EventSubscriptionsProps {
  userId: string;
  onEvent?: (event: AppSyncEvent) => void;
  onChatEvent?: (event: ChatEvent) => void;
  onUIControlEvent?: (event: UIControlEvent) => void;
  onNotesEvent?: (event: any) => void;
  className?: string;
}

/**
 * Main component for managing user event subscriptions
 */
export function EventSubscriptions({
  userId,
  onEvent,
  onChatEvent,
  onUIControlEvent,
  onNotesEvent,
  className = ''
}: EventSubscriptionsProps) {
  const subscriptions = useUserSubscriptions(userId);
  const { isReady, initialize } = useSubscriptionManager();

  // Initialize subscription manager if not ready
  useEffect(() => {
    if (!isReady) {
      initialize();
    }
  }, [isReady, initialize]);

  // Handle events
  useEffect(() => {
    if (subscriptions.events.general && onEvent) {
      onEvent(subscriptions.events.general);
    }
  }, [subscriptions.events.general, onEvent]);

  useEffect(() => {
    if (subscriptions.events.chat && onChatEvent) {
      onChatEvent(subscriptions.events.chat);
    }
  }, [subscriptions.events.chat, onChatEvent]);

  useEffect(() => {
    if (subscriptions.events.uiControl && onUIControlEvent) {
      onUIControlEvent(subscriptions.events.uiControl);
    }
  }, [subscriptions.events.uiControl, onUIControlEvent]);

  useEffect(() => {
    if (subscriptions.events.notes && onNotesEvent) {
      onNotesEvent(subscriptions.events.notes);
    }
  }, [subscriptions.events.notes, onNotesEvent]);

  return (
    <div className={`event-subscriptions ${className}`}>
      <SubscriptionStatus 
        isConnected={subscriptions.isConnected}
        error={subscriptions.error}
        onReconnect={subscriptions.reconnectAll}
      />
    </div>
  );
}

/**
 * Component for displaying subscription status
 */
export interface SubscriptionStatusProps {
  isConnected: boolean;
  error: Error | null;
  onReconnect: () => void;
  showDetails?: boolean;
  className?: string;
}

export function SubscriptionStatus({
  isConnected,
  error,
  onReconnect,
  showDetails = false,
  className = ''
}: SubscriptionStatusProps) {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      // Auto-hide error after 5 seconds
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!showDetails && isConnected && !error) {
    return null; // Don't show anything when everything is working
  }

  return (
    <div className={`subscription-status ${className}`}>
      <div className="flex items-center gap-2">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
        </div>
        
        <span className="text-sm">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>

        {!isConnected && (
          <button
            onClick={onReconnect}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reconnect
          </button>
        )}
      </div>

      {showError && error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
          <div className="flex justify-between items-start">
            <span>Connection error: {error.message}</span>
            <button
              onClick={() => setShowError(false)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Component for voice session event handling
 */
export interface VoiceSessionEventsProps {
  sessionId: string;
  onStatusChange?: (status: string, data?: any) => void;
  className?: string;
}

export function VoiceSessionEvents({
  sessionId,
  onStatusChange,
  className = ''
}: VoiceSessionEventsProps) {
  const { data: voiceEvent, isConnected, error } = useVoiceSessionSubscription(sessionId);

  useEffect(() => {
    if (voiceEvent && onStatusChange) {
      onStatusChange(voiceEvent.payload.status, voiceEvent.payload.data);
    }
  }, [voiceEvent, onStatusChange]);

  return (
    <div className={`voice-session-events ${className}`}>
      {voiceEvent && (
        <div className="voice-event-display p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm font-medium">Voice Session: {voiceEvent.sessionId}</div>
          <div className="text-xs text-gray-600">Status: {voiceEvent.payload.status}</div>
          {voiceEvent.payload.data && (
            <div className="text-xs text-gray-500 mt-1">
              Data: {JSON.stringify(voiceEvent.payload.data)}
            </div>
          )}
        </div>
      )}
      
      <SubscriptionStatus 
        isConnected={isConnected}
        error={error}
        onReconnect={() => window.location.reload()} // Simple reconnect for now
        showDetails={true}
      />
    </div>
  );
}

/**
 * Component for chat event display
 */
export interface ChatEventsProps {
  userId: string;
  onMessage?: (message: any) => void;
  className?: string;
}

export function ChatEvents({
  userId,
  onMessage,
  className = ''
}: ChatEventsProps) {
  const { data: chatEvent, isConnected } = useChatSubscription(userId);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (chatEvent) {
      const message = chatEvent.payload.message;
      setMessages(prev => [...prev, message]);
      
      if (onMessage) {
        onMessage(message);
      }
    }
  }, [chatEvent, onMessage]);

  return (
    <div className={`chat-events ${className}`}>
      <div className="chat-messages space-y-2">
        {messages.map((message, index) => (
          <div key={index} className="message p-2 bg-gray-50 border rounded">
            <div className="text-sm">{message.content}</div>
            <div className="text-xs text-gray-500">{message.timestamp}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Component for UI control event handling
 */
export interface UIControlEventsProps {
  userId: string;
  onUIUpdate?: (action: string, target: string, content?: any) => void;
  className?: string;
}

export function UIControlEvents({
  userId,
  onUIUpdate,
  className = ''
}: UIControlEventsProps) {
  const { data: uiEvent } = useUIControlSubscription(userId);

  useEffect(() => {
    if (uiEvent && onUIUpdate) {
      onUIUpdate(
        uiEvent.payload.action,
        uiEvent.payload.target,
        uiEvent.payload.content
      );
    }
  }, [uiEvent, onUIUpdate]);

  return (
    <div className={`ui-control-events ${className}`}>
      {uiEvent && (
        <div className="ui-event-display p-2 bg-purple-50 border border-purple-200 rounded">
          <div className="text-sm font-medium">UI Update</div>
          <div className="text-xs text-gray-600">
            Action: {uiEvent.payload.action} | Target: {uiEvent.payload.target}
          </div>
        </div>
      )}
    </div>
  );
}

// Import the hook for external use
import { useVoiceSessionSubscription, useChatSubscription } from '../../lib/use-appsync-subscriptions';

export default EventSubscriptions;