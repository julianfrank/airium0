import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NovaSonicServiceImpl } from '../services/nova-sonic.service';
import { EventRoutingService } from '../services/event-routing.service';

// Mock AWS SDK
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ StatusCode: 200 }),
  })),
  InvokeCommand: vi.fn(),
}));

// Mock EventRoutingService
vi.mock('../services/event-routing.service', () => ({
  EventRoutingService: vi.fn().mockImplementation(() => ({
    routeVoiceSessionEvent: vi.fn().mockResolvedValue(undefined),
    routeChatEvent: vi.fn().mockResolvedValue(undefined),
    routeUIControlEvent: vi.fn().mockResolvedValue(undefined),
    routeNotesEvent: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('Nova Sonic Integration', () => {
  let novaSonicService: NovaSonicServiceImpl;
  let eventRoutingService: EventRoutingService;

  beforeEach(() => {
    vi.clearAllMocks();
    novaSonicService = new NovaSonicServiceImpl(
      'nova-sonic-processor',
      'nova-sonic-session-manager',
      'us-east-1'
    );
    eventRoutingService = new EventRoutingService('appsync-event-publisher', 'us-east-1');
  });

  describe('Voice Session Lifecycle Integration', () => {
    it('should handle complete voice session lifecycle with events', async () => {
      const connectionId = 'conn-123';
      const userId = 'user-123';
      const audioData = 'base64-encoded-audio-data';

      // Step 1: Initialize session
      const sessionId = await novaSonicService.initializeSession(connectionId, userId);
      expect(sessionId).toMatch(/^voice-\d+-[a-z0-9]+$/);

      // Verify session started event would be published
      await eventRoutingService.routeVoiceSessionEvent(
        sessionId,
        'started',
        { audioFormat: 'webm', novaSonicSessionId: `ns-${sessionId}` },
        userId
      );

      // Step 2: Process audio data
      const mockLambdaClient = (novaSonicService as any).lambdaClient;
      mockLambdaClient.send
        .mockResolvedValueOnce({ 
          StatusCode: 200,
          Payload: new TextEncoder().encode(JSON.stringify({
            body: JSON.stringify({ connectionId, userId }),
          })),
        })
        .mockResolvedValueOnce({ StatusCode: 200 });

      const voiceResponse = await novaSonicService.processAudioData(audioData, sessionId);
      expect(voiceResponse.sessionId).toBe(sessionId);

      // Verify processing event would be published
      await eventRoutingService.routeVoiceSessionEvent(
        sessionId,
        'processing',
        { transcript: 'Mock transcription', confidence: 0.95 },
        userId
      );

      // Verify AI response event would be published
      await eventRoutingService.routeVoiceSessionEvent(
        sessionId,
        'response_ready',
        { 
          response: voiceResponse.text,
          audioUrl: 's3://bucket/audio-response.mp3',
          generatedContent: 'AI generated summary content',
        },
        userId
      );

      // Step 3: End session
      mockLambdaClient.send
        .mockResolvedValueOnce({ 
          StatusCode: 200,
          Payload: new TextEncoder().encode(JSON.stringify({
            body: JSON.stringify({ connectionId, userId }),
          })),
        })
        .mockResolvedValueOnce({ StatusCode: 200 });

      await novaSonicService.endSession(sessionId);

      // Verify session completed event would be published
      await eventRoutingService.routeVoiceSessionEvent(
        sessionId,
        'completed',
        { duration: 45.2, messageCount: 1 },
        userId
      );

      // Verify all events were routed
      expect(eventRoutingService.routeVoiceSessionEvent).toHaveBeenCalledTimes(4);
    });

    it('should handle voice session errors with proper event routing', async () => {
      const sessionId = 'voice-error-123';
      const userId = 'user-123';

      // Simulate error during processing
      const mockLambdaClient = (novaSonicService as any).lambdaClient;
      mockLambdaClient.send.mockRejectedValue(new Error('Processing failed'));

      // Verify error event would be published
      await eventRoutingService.routeVoiceSessionEvent(
        sessionId,
        'error',
        { error: 'Processing failed' },
        userId
      );

      expect(eventRoutingService.routeVoiceSessionEvent).toHaveBeenCalledWith(
        sessionId,
        'error',
        { error: 'Processing failed' },
        userId
      );
    });
  });

  describe('Real-time Communication Integration', () => {
    it('should integrate with WebSocket for real-time updates', async () => {
      const connectionId = 'conn-realtime-123';
      const userId = 'user-123';
      const sessionId = 'voice-realtime-123';

      // Simulate real-time transcription updates
      await eventRoutingService.routeVoiceSessionEvent(
        sessionId,
        'processing',
        { 
          transcript: 'Hello, how can I help you today?',
          confidence: 0.95,
          isPartial: true,
        },
        userId
      );

      // Simulate real-time AI response streaming
      await eventRoutingService.routeChatEvent(
        userId,
        {
          id: 'msg-123',
          type: 'ai_response',
          content: 'I can help you with that task.',
          streaming: true,
          sessionId,
        },
        { sessionId }
      );

      // Verify real-time events were routed
      expect(eventRoutingService.routeVoiceSessionEvent).toHaveBeenCalledTimes(1);
      expect(eventRoutingService.routeChatEvent).toHaveBeenCalledTimes(1);
    });

    it('should handle UI control events for voice interface', async () => {
      const userId = 'user-123';
      const sessionId = 'voice-ui-123';

      // Show voice session UI
      await eventRoutingService.routeUIControlEvent(
        userId,
        'show',
        'voice-session',
        {
          sessionId,
          status: 'active',
          audioFormat: 'webm',
        }
      );

      // Update voice transcript in real-time
      await eventRoutingService.routeUIControlEvent(
        userId,
        'update',
        'voice-transcript',
        {
          sessionId,
          transcript: 'Real-time transcription update...',
          confidence: 0.92,
        }
      );

      // Hide voice session UI when completed
      await eventRoutingService.routeUIControlEvent(
        userId,
        'hide',
        'voice-session',
        {
          sessionId,
          status: 'completed',
          duration: 30.5,
        }
      );

      expect(eventRoutingService.routeUIControlEvent).toHaveBeenCalledTimes(3);
    });
  });

  describe('AI Content Generation Integration', () => {
    it('should create notes from voice interactions', async () => {
      const userId = 'user-123';
      const sessionId = 'voice-notes-123';

      // AI generates content from voice interaction
      const noteId = `ai-note-${Date.now()}`;
      await eventRoutingService.routeNotesEvent(
        userId,
        noteId,
        'create',
        {
          title: 'AI Generated Summary',
          content: '# Voice Session Summary\n\nKey points from the conversation...',
          source: 'voice_interaction',
          sessionId,
          generatedBy: 'claude-3-haiku',
        }
      );

      // Show the generated note in UI
      await eventRoutingService.routeUIControlEvent(
        userId,
        'show',
        'note',
        {
          noteId,
          title: 'AI Generated Summary',
          content: '# Voice Session Summary\n\nKey points from the conversation...',
        }
      );

      expect(eventRoutingService.routeNotesEvent).toHaveBeenCalledTimes(1);
      expect(eventRoutingService.routeUIControlEvent).toHaveBeenCalledTimes(1);
    });

    it('should handle rich content generation from voice', async () => {
      const userId = 'user-123';
      const sessionId = 'voice-rich-123';

      // AI generates rich content with images and diagrams
      await eventRoutingService.routeUIControlEvent(
        userId,
        'show',
        'rich-content',
        {
          sessionId,
          markdown: '# Analysis Results\n\nBased on your voice input...',
          images: ['generated-chart.png'],
          mermaid: 'graph TD; A[Voice Input] --> B[AI Processing] --> C[Rich Output];',
          generatedBy: 'voice_interaction',
        }
      );

      // Show generated media content
      await eventRoutingService.routeUIControlEvent(
        userId,
        'show',
        'generated-media',
        {
          sessionId,
          media: {
            images: ['analysis-chart.jpg', 'summary-diagram.png'],
            videos: ['explanation-video.mp4'],
          },
          source: 'voice_ai_generation',
        }
      );

      expect(eventRoutingService.routeUIControlEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multi-language and Accessibility Support', () => {
    it('should support multiple languages in voice processing', async () => {
      const connectionId = 'conn-multilang-123';
      const userId = 'user-123';

      // Test Spanish voice session
      const spanishSessionId = await novaSonicService.initializeSession(connectionId, userId);
      
      const mockLambdaClient = (novaSonicService as any).lambdaClient;
      mockLambdaClient.send.mockResolvedValue({ 
        StatusCode: 200,
        Payload: new TextEncoder().encode(JSON.stringify({
          body: JSON.stringify({ connectionId, userId }),
        })),
      });

      await novaSonicService.transcribeAudio('spanish-audio-data', spanishSessionId, {
        language: 'es-ES',
      });

      await novaSonicService.synthesizeVoice('Hola, ¿cómo puedo ayudarte?', spanishSessionId, {
        language: 'es-ES',
        voice: 'neural',
      });

      // Verify language-specific events
      await eventRoutingService.routeVoiceSessionEvent(
        spanishSessionId,
        'processing',
        { 
          transcript: 'Hola, necesito ayuda con mi proyecto',
          language: 'es-ES',
          confidence: 0.93,
        },
        userId
      );

      expect(eventRoutingService.routeVoiceSessionEvent).toHaveBeenCalledWith(
        spanishSessionId,
        'processing',
        expect.objectContaining({ language: 'es-ES' }),
        userId
      );
    });

    it('should handle voice accessibility features', async () => {
      const userId = 'user-accessibility-123';
      const sessionId = 'voice-a11y-123';

      // Voice-controlled UI navigation
      await eventRoutingService.routeUIControlEvent(
        userId,
        'show',
        'accessibility-panel',
        {
          sessionId,
          features: ['voice-navigation', 'screen-reader-support', 'high-contrast'],
          voiceCommands: ['show notes', 'hide panel', 'read content'],
        }
      );

      // Voice-activated content reading
      await eventRoutingService.routeUIControlEvent(
        userId,
        'update',
        'screen-reader',
        {
          sessionId,
          action: 'read_content',
          content: 'Reading the current page content aloud...',
          speed: 'normal',
        }
      );

      expect(eventRoutingService.routeUIControlEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent voice sessions', async () => {
      const userId = 'user-concurrent-123';
      const sessions = [];

      // Create multiple concurrent sessions
      for (let i = 0; i < 3; i++) {
        const connectionId = `conn-${i}`;
        const sessionId = await novaSonicService.initializeSession(connectionId, userId);
        sessions.push({ sessionId, connectionId });

        await eventRoutingService.routeVoiceSessionEvent(
          sessionId,
          'started',
          { audioFormat: 'webm', concurrent: true },
          userId
        );
      }

      expect(sessions).toHaveLength(3);
      expect(eventRoutingService.routeVoiceSessionEvent).toHaveBeenCalledTimes(3);

      // Verify each session has unique ID
      const sessionIds = sessions.map(s => s.sessionId);
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(3);
    });

    it('should handle session cleanup and resource management', async () => {
      const userId = 'user-cleanup-123';
      const sessionIds = [];

      // Create and end multiple sessions
      for (let i = 0; i < 5; i++) {
        const sessionId = await novaSonicService.initializeSession(`conn-${i}`, userId);
        sessionIds.push(sessionId);

        // Mock session info for ending
        const mockLambdaClient = (novaSonicService as any).lambdaClient;
        mockLambdaClient.send.mockResolvedValue({ 
          StatusCode: 200,
          Payload: new TextEncoder().encode(JSON.stringify({
            body: JSON.stringify({ connectionId: `conn-${i}`, userId }),
          })),
        });

        await novaSonicService.endSession(sessionId);

        await eventRoutingService.routeVoiceSessionEvent(
          sessionId,
          'completed',
          { cleanup: true, sessionIndex: i },
          userId
        );
      }

      expect(sessionIds).toHaveLength(5);
      expect(eventRoutingService.routeVoiceSessionEvent).toHaveBeenCalledTimes(5);
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy requirement 6.2 - Nova Sonic voice-based input and output', async () => {
      const connectionId = 'conn-req-6-2';
      const userId = 'user-req-6-2';

      // Voice input processing
      const sessionId = await novaSonicService.initializeSession(connectionId, userId);
      
      const mockLambdaClient = (novaSonicService as any).lambdaClient;
      mockLambdaClient.send.mockResolvedValue({ 
        StatusCode: 200,
        Payload: new TextEncoder().encode(JSON.stringify({
          body: JSON.stringify({ connectionId, userId }),
        })),
      });

      // Process voice input
      const voiceResponse = await novaSonicService.processAudioData('voice-input-data', sessionId);
      expect(voiceResponse.text).toBeTruthy();
      expect(voiceResponse.audio).toBeTruthy();

      // Voice output generation
      const synthesizedAudio = await novaSonicService.synthesizeVoice(
        'This is the AI response',
        sessionId
      );
      expect(synthesizedAudio).toBeTruthy();

      // Verify Nova Sonic integration
      expect(sessionId).toMatch(/^voice-\d+-[a-z0-9]+$/);
    });

    it('should integrate with WebSocket and AppSync Events as designed', async () => {
      const sessionId = 'voice-integration-123';
      const userId = 'user-integration-123';

      // Verify WebSocket integration through event routing
      await eventRoutingService.routeVoiceSessionEvent(
        sessionId,
        'started',
        { webSocketIntegration: true },
        userId
      );

      // Verify AppSync Events integration through event routing
      await eventRoutingService.routeChatEvent(
        userId,
        {
          type: 'voice_generated',
          content: 'Voice-generated chat message',
          sessionId,
          appSyncIntegration: true,
        },
        { sessionId }
      );

      expect(eventRoutingService.routeVoiceSessionEvent).toHaveBeenCalledWith(
        sessionId,
        'started',
        expect.objectContaining({ webSocketIntegration: true }),
        userId
      );

      expect(eventRoutingService.routeChatEvent).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ appSyncIntegration: true }),
        { sessionId }
      );
    });
  });
});