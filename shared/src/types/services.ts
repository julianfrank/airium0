export interface NovaSonicService {
  initializeBidirectionalStream(connectionId: string, userId: string): Promise<string>;
  invokeModelWithBidirectionalStream(modelId: string, body: any): Promise<any>;
  generateOrderedStream(initialRequest?: any): any;
  processAudioStream(audioChunk: Buffer, streamId: string): Promise<void>;
  handleStreamResponse(response: any, connectionId: string): Promise<void>;
  closeBidirectionalStream(streamId: string): Promise<void>;
}

export interface AppSyncEventService {
  publishEvent(eventType: string, payload: any, connectionId: string): Promise<void>;
  publishVoiceSessionEvent(sessionId: string, status: string, data?: any): Promise<void>;
  publishChatEvent(userId: string, message: any): Promise<void>;
}

export interface VoiceResponse {
  sessionId: string;
  audioData?: string;
  transcription?: string;
  aiResponse?: string;
  timestamp: string;
  status: 'processing' | 'completed' | 'error';
}