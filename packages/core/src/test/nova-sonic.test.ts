import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NovaSonicServiceImpl } from '../services/nova-sonic.service';

// Mock AWS SDK
const mockLambdaClient = {
  send: vi.fn(),
};

vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn().mockImplementation(() => mockLambdaClient),
  InvokeCommand: vi.fn(),
}));

describe('NovaSonicService', () => {
  let service: NovaSonicServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NovaSonicServiceImpl(
      'test-processor-function',
      'test-session-manager-function',
      'us-east-1'
    );
    mockLambdaClient.send.mockResolvedValue({ StatusCode: 200 });
  });

  describe('Session Management', () => {
    it('should initialize a voice session successfully', async () => {
      const connectionId = 'conn-123';
      const userId = 'user-123';

      const sessionId = await service.initializeSession(connectionId, userId);

      expect(sessionId).toMatch(/^voice-\d+-[a-z0-9]+$/);
      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
    });

    it('should handle session initialization failures', async () => {
      mockLambdaClient.send.mockResolvedValue({ StatusCode: 500 });

      await expect(
        service.initializeSession('conn-123', 'user-123')
      ).rejects.toThrow('Failed to initialize session: 500');
    });

    it('should end a voice session successfully', async () => {
      const sessionId = 'voice-123';
      
      // Mock session info retrieval
      mockLambdaClient.send
        .mockResolvedValueOnce({ 
          StatusCode: 200,
          Payload: new TextEncoder().encode(JSON.stringify({
            body: JSON.stringify({
              connectionId: 'conn-123',
              userId: 'user-123',
            }),
          })),
        })
        .mockResolvedValueOnce({ StatusCode: 200 });

      await service.endSession(sessionId);

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('Audio Processing', () => {
    it('should process audio data successfully', async () => {
      const audioData = 'base64-encoded-audio-data';
      const sessionId = 'voice-123';

      // Mock session info retrieval
      mockLambdaClient.send
        .mockResolvedValueOnce({ 
          StatusCode: 200,
          Payload: new TextEncoder().encode(JSON.stringify({
            body: JSON.stringify({
              connectionId: 'conn-123',
              userId: 'user-123',
            }),
          })),
        })
        .mockResolvedValueOnce({ StatusCode: 200 });

      const response = await service.processAudioData(audioData, sessionId);

      expect(response).toEqual({
        text: 'Processed audio response',
        audio: 'base64-encoded-audio-response',
        sessionId,
        metadata: {
          processingTime: expect.any(Number),
          model: 'claude-3-haiku',
          language: 'en-US',
        },
      });

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(2);
    });

    it('should handle audio processing failures', async () => {
      // Mock session info retrieval success, but processing failure
      mockLambdaClient.send
        .mockResolvedValueOnce({ 
          StatusCode: 200,
          Payload: new TextEncoder().encode(JSON.stringify({
            body: JSON.stringify({
              connectionId: 'conn-123',
              userId: 'user-123',
            }),
          })),
        })
        .mockResolvedValueOnce({ StatusCode: 500 });

      await expect(
        service.processAudioData('audio-data', 'voice-123')
      ).rejects.toThrow('Failed to process audio: 500');
    });

    it('should handle missing session for audio processing', async () => {
      // Mock session not found
      mockLambdaClient.send.mockResolvedValueOnce({ StatusCode: 404 });

      await expect(
        service.processAudioData('audio-data', 'nonexistent-session')
      ).rejects.toThrow('Session not found: nonexistent-session');
    });
  });

  describe('Voice Transcription', () => {
    it('should transcribe audio successfully', async () => {
      const audioData = 'base64-encoded-audio';
      const sessionId = 'voice-123';

      // Mock session info retrieval
      mockLambdaClient.send
        .mockResolvedValueOnce({ 
          StatusCode: 200,
          Payload: new TextEncoder().encode(JSON.stringify({
            body: JSON.stringify({
              connectionId: 'conn-123',
              userId: 'user-123',
            }),
          })),
        })
        .mockResolvedValueOnce({ StatusCode: 200 });

      const transcription = await service.transcribeAudio(audioData, sessionId, {
        language: 'es-ES',
      });

      expect(transcription).toBe('Transcribed text from audio');
      expect(mockLambdaClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('Voice Synthesis', () => {
    it('should synthesize voice successfully', async () => {
      const text = 'Hello, this is a test message';
      const sessionId = 'voice-123';

      // Mock session info retrieval
      mockLambdaClient.send
        .mockResolvedValueOnce({ 
          StatusCode: 200,
          Payload: new TextEncoder().encode(JSON.stringify({
            body: JSON.stringify({
              connectionId: 'conn-123',
              userId: 'user-123',
            }),
          })),
        })
        .mockResolvedValueOnce({ StatusCode: 200 });

      const audioData = await service.synthesizeVoice(text, sessionId, {
        language: 'en-US',
        voice: 'neural',
      });

      expect(audioData).toBe('base64-encoded-synthesized-audio');
      expect(mockLambdaClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('Voice Response Sending', () => {
    it('should send voice response to connection', async () => {
      const response = 'This is an AI response';
      const connectionId = 'conn-123';

      await service.sendVoiceResponse(response, connectionId);

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session Listing', () => {
    it('should list user sessions successfully', async () => {
      const userId = 'user-123';
      const mockSessions = [
        { sessionId: 'voice-1', status: 'COMPLETED', createdAt: '2024-01-01T00:00:00Z' },
        { sessionId: 'voice-2', status: 'ACTIVE', createdAt: '2024-01-02T00:00:00Z' },
      ];

      mockLambdaClient.send.mockResolvedValue({
        StatusCode: 200,
        Payload: new TextEncoder().encode(JSON.stringify({
          body: JSON.stringify({ sessions: mockSessions }),
        })),
      });

      const sessions = await service.listUserSessions(userId);

      expect(sessions).toEqual(mockSessions);
      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
    });

    it('should handle empty session list', async () => {
      mockLambdaClient.send.mockResolvedValue({
        StatusCode: 200,
        Payload: new TextEncoder().encode(JSON.stringify({
          body: JSON.stringify({ sessions: [] }),
        })),
      });

      const sessions = await service.listUserSessions('user-123');

      expect(sessions).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle Lambda invocation errors', async () => {
      mockLambdaClient.send.mockRejectedValue(new Error('Lambda invocation failed'));

      await expect(
        service.initializeSession('conn-123', 'user-123')
      ).rejects.toThrow('Lambda invocation failed');
    });

    it('should handle malformed responses gracefully', async () => {
      mockLambdaClient.send.mockResolvedValue({
        StatusCode: 200,
        Payload: new TextEncoder().encode('invalid-json'),
      });

      await expect(
        service.listUserSessions('user-123')
      ).rejects.toThrow('Unexpected token');
    });
  });

  describe('Requirements Satisfaction', () => {
    it('should satisfy requirement 6.2 - Nova Sonic voice interaction', async () => {
      const connectionId = 'conn-123';
      const userId = 'user-123';
      const audioData = 'base64-audio-data';

      // Initialize session
      const sessionId = await service.initializeSession(connectionId, userId);
      expect(sessionId).toBeTruthy();

      // Mock session info for processing
      mockLambdaClient.send.mockResolvedValueOnce({ 
        StatusCode: 200,
        Payload: new TextEncoder().encode(JSON.stringify({
          body: JSON.stringify({ connectionId, userId }),
        })),
      }).mockResolvedValueOnce({ StatusCode: 200 });

      // Process audio
      const response = await service.processAudioData(audioData, sessionId);
      expect(response.sessionId).toBe(sessionId);

      // Mock session info for ending
      mockLambdaClient.send.mockResolvedValueOnce({ 
        StatusCode: 200,
        Payload: new TextEncoder().encode(JSON.stringify({
          body: JSON.stringify({ connectionId, userId }),
        })),
      }).mockResolvedValueOnce({ StatusCode: 200 });

      // End session
      await service.endSession(sessionId);

      // Verify all operations completed successfully
      expect(mockLambdaClient.send).toHaveBeenCalledTimes(5); // init + get + process + get + end
    });

    it('should support multiple audio formats and languages', async () => {
      const sessionId = 'voice-123';
      
      // Mock session info
      mockLambdaClient.send.mockResolvedValue({ 
        StatusCode: 200,
        Payload: new TextEncoder().encode(JSON.stringify({
          body: JSON.stringify({
            connectionId: 'conn-123',
            userId: 'user-123',
          }),
        })),
      });

      // Test different languages
      await service.transcribeAudio('audio-data', sessionId, { language: 'es-ES' });
      await service.synthesizeVoice('Hola mundo', sessionId, { language: 'es-ES', voice: 'neural' });

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(4);
    });
  });
});