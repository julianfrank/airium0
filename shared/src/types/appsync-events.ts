import { ChatMessage } from './chat.js';

export interface AppSyncEvent {
  eventType: string;
  payload: any;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  connectionId?: string;
}

export interface VoiceSessionEvent extends AppSyncEvent {
  eventType: 'voice_session_event';
  sessionId: string;
  payload: {
    status: 'started' | 'processing' | 'completed' | 'error';
    data?: any;
  };
}

export interface ChatEvent extends AppSyncEvent {
  eventType: 'chat_event';
  userId: string;
  payload: {
    message: ChatMessage;
    type: 'user_message' | 'ai_response' | 'system_message';
  };
}

// ChatMessage is imported from chat.ts

export interface UIControlEvent extends AppSyncEvent {
  eventType: 'ui_control_event';
  userId: string;
  payload: {
    action: 'show_note' | 'hide_note' | 'show_media' | 'hide_media' | 'update_content';
    content?: any;
    noteId?: string;
    mediaId?: string;
  };
}

export interface ApplicationEvent extends AppSyncEvent {
  eventType: 'application_event';
  userId: string;
  payload: {
    applicationId: string;
    action: 'launched' | 'completed' | 'error';
    result?: any;
    error?: string;
  };
}

export interface EventSubscription {
  subscriptionId: string;
  eventType: string;
  userId?: string;
  sessionId?: string;
  filters?: Record<string, any>;
}

export interface EventPublishRequest {
  eventType: string;
  payload: any;
  targetUsers?: string[];
  targetSessions?: string[];
  targetConnections?: string[];
}