export interface VoiceSession {
  PK: string;          // VOICE#${sessionId}
  SK: string;          // METADATA
  sessionId: string;
  novaSonicSessionId: string;
  connectionId: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: string;
}

export interface VoiceResponse {
  text: string;
  audio?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface NovaSonicService {
  initializeSession(connectionId: string, userId: string): Promise<string>;
  processAudioData(audioData: string, sessionId: string): Promise<VoiceResponse>;
  endSession(sessionId: string): Promise<void>;
  sendVoiceResponse(response: string, connectionId: string): Promise<void>;
}