export interface ChatMessage {
  id: string;
  type: 'TEXT' | 'VOICE' | 'MEDIA';
  content: string;
  voiceSessionId?: string;  // For Nova Sonic voice sessions
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface ChatSession {
  PK: string;          // USER#${userId}
  SK: string;          // CHAT#${sessionId}
  sessionId: string;
  connectionId?: string;
  messages: ChatMessage[];
  context: UserContext;
  createdAt: string;
  updatedAt: string;
}

export interface UserContext {
  userId: string;
  groups: string[];
  applications: string[];
  preferences?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  type: 'TEXT' | 'RICH_CONTENT' | 'MEDIA';
  metadata?: Record<string, any>;
}

export interface GeneratedContent {
  content: string;
  type: ContentType;
  metadata?: Record<string, any>;
}

export interface EnhancedResponse {
  text: string;
  voice?: string;
  actions?: UIAction[];
}

export interface UIAction {
  type: 'SHOW_NOTE' | 'HIDE_NOTE' | 'SHOW_MEDIA' | 'HIDE_MEDIA';
  payload: any;
}

export type ContentType = 'TEXT' | 'MARKDOWN' | 'IMAGE' | 'VIDEO' | 'AUDIO';