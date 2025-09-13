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
}

export interface SubscriptionEvent {
  id: string;
  type: 'VOICE_SESSION' | 'CHAT_MESSAGE' | 'UI_UPDATE' | 'SYSTEM_NOTIFICATION';
  data: any;
  timestamp: string;
}