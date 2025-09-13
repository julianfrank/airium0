export interface AppSyncEvent {
  eventType: string;
  payload: any;
  connectionId?: string;
  userId?: string;
  timestamp: string;
}

export interface AppSyncEventService {
  publishEvent(eventType: string, payload: any, connectionId: string): Promise<void>;
  publishVoiceSessionEvent(sessionId: string, status: string, data?: any): Promise<void>;
  publishChatEvent(userId: string, message: any): Promise<void>;
  publishUIControlEvent(userId: string, action: string, target: string, content?: any): Promise<void>;
  publishNotesEvent(userId: string, noteId: string, action: string, content?: any): Promise<void>;
}

export interface SubscriptionEvent {
  id: string;
  type: 'VOICE_SESSION' | 'CHAT_MESSAGE' | 'UI_UPDATE' | 'SYSTEM_NOTIFICATION' | 'UI_CONTROL' | 'NOTES_UPDATE';
  data: any;
  timestamp: string;
}

export interface UIControlEvent {
  userId: string;
  action: 'show' | 'hide' | 'update' | 'remove';
  target: string;
  content?: any;
  timestamp: string;
}

export interface NotesEvent {
  userId: string;
  noteId: string;
  action: 'create' | 'update' | 'delete' | 'show' | 'hide';
  content?: any;
  timestamp: string;
}