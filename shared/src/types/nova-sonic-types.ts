export interface VoiceSession {
  PK: string;
  SK: string;
  sessionId: string;
  novaSonicSessionId: string;
  connectionId: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ERROR';
  createdAt: string;
  updatedAt: string;
  audioFormat?: string;
  totalDuration?: number;
  messageCount?: number;
}

export interface VoiceProcessingEvent {
  connectionId: string;
  sessionId: string;
  userId: string;
  messageType: 'voice_session_start' | 'voice_data_process' | 'voice_session_end' | 'voice_transcribe' | 'voice_synthesize';
  audioData?: string;
  textInput?: string;
  audioFormat?: string;
  processingOptions?: {
    streaming?: boolean;
    language?: string;
    model?: string;
  };
}

export interface VoiceResponse {
  type: string;
  sessionId: string;
  data?: any;
  timestamp: string;
}

export interface NovaSonicCapabilities {
  transcription: boolean;
  synthesis: boolean;
  streaming: boolean;
  languages: string[];
  models: string[];
}

export interface AudioProcessingResult {
  transcription?: string;
  aiResponse?: string;
  audioResponse?: string;
  audioKey?: string;
  processingTime?: number;
  confidence?: number;
}

export interface SessionEvent {
  action: 'create' | 'update' | 'end' | 'get' | 'list';
  sessionId?: string;
  connectionId?: string;
  userId?: string;
  data?: any;
}

export interface WebSocketVoiceMessage {
  action: 'voice_session_start' | 'voice_data' | 'voice_session_end' | 'ping';
  sessionId?: string;
  userId?: string;
  data?: {
    audioData?: string;
    audioFormat?: string;
    streaming?: boolean;
    language?: string;
    model?: string;
  };
}

export interface VoiceSessionConfig {
  audioFormat: string;
  streaming: boolean;
  language: string;
  model: string;
}

export interface NovaSonicContext {
  sessionId: string;
  connectionId: string;
  userId: string;
  audioFormat: string;
  language: string;
  conversationHistory: any[];
  processingState: 'ready' | 'processing' | 'completed' | 'error';
}