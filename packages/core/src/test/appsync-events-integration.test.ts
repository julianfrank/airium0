import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppSyncEventsService } from '../services/appsync-events.service';

// Mock AWS SDK
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ StatusCode: 200 }),
  })),
  InvokeCommand: vi.fn(),
}));

describe('AppSync Events Integration', () => {
  let service: AppSyncEventsService;
  let mockLambdaClient: any;
  let mockInvokeCommand: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the mocked modules
    const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
    mockInvokeCommand = InvokeCommand;
    
    service = new AppSyncEventsService('test-event-publisher-function', 'us-east-1');
    mockLambdaClient = (service as any).lambdaClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Publishing', () => {
    it('should publish voice session events with correct payload structure', async () => {
      const sessionId = 'voice-session-123';
      const status = 'started';
      const data = { audioFormat: 'webm', userId: 'user123' };

      await service.publishVoiceSessionEvent(sessionId, status, data);

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
      expect(mockInvokeCommand).toHaveBeenCalledWith({
        FunctionName: 'test-event-publisher-function',
        Payload: JSON.stringify({
          eventType: 'voice_session_event',
          sessionId,
          payload: {
            status,
            data,
          },
        }),
      });
    });

    it('should publish chat events with message payload', async () => {
      const userId = 'user123';
      const message = {
        id: 'msg-123',
        content: 'Hello world',
        type: 'text',
        timestamp: new Date().toISOString(),
      };

      await service.publishChatEvent(userId, message);

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
      expect(mockInvokeCommand).toHaveBeenCalledWith({
        FunctionName: 'test-event-publisher-function',
        Payload: JSON.stringify({
          eventType: 'chat_event',
          userId,
          payload: {
            message,
          },
        }),
      });
    });

    it('should publish UI control events for dynamic interface management', async () => {
      const userId = 'user123';
      const action = 'show';
      const target = 'notes-panel';
      const content = {
        noteId: 'note-456',
        title: 'Meeting Notes',
        content: 'Important discussion points...',
      };

      await service.publishUIControlEvent(userId, action, target, content);

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
      expect(mockInvokeCommand).toHaveBeenCalledWith({
        FunctionName: 'test-event-publisher-function',
        Payload: JSON.stringify({
          eventType: 'ui_control_event',
          userId,
          payload: {
            action,
            target,
            content,
          },
        }),
      });
    });

    it('should publish notes events for content management', async () => {
      const userId = 'user123';
      const noteId = 'note-789';
      const action = 'create';
      const content = {
        title: 'AI Generated Summary',
        markdown: '# Summary\n\nKey points from the conversation...',
        tags: ['ai-generated', 'summary'],
      };

      await service.publishNotesEvent(userId, noteId, action, content);

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
      expect(mockInvokeCommand).toHaveBeenCalledWith({
        FunctionName: 'test-event-publisher-function',
        Payload: JSON.stringify({
          eventType: 'notes_event',
          userId,
          payload: {
            noteId,
            action,
            content,
          },
        }),
      });
    });

    it('should publish general events for custom event types', async () => {
      const eventType = 'application_launched';
      const payload = {
        applicationId: 'app-123',
        userId: 'user123',
        timestamp: new Date().toISOString(),
      };
      const connectionId = 'connection-456';

      await service.publishEvent(eventType, payload, connectionId);

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
      expect(mockInvokeCommand).toHaveBeenCalledWith({
        FunctionName: 'test-event-publisher-function',
        Payload: JSON.stringify({
          eventType: 'general_event',
          payload: {
            type: eventType,
            data: payload,
          },
          connectionId,
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Lambda invocation failures gracefully', async () => {
      mockLambdaClient.send.mockRejectedValue(new Error('Lambda invocation failed'));

      await expect(
        service.publishChatEvent('user123', { content: 'test' })
      ).rejects.toThrow('Lambda invocation failed');

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
    });

    it('should handle non-200 status codes from Lambda', async () => {
      mockLambdaClient.send.mockResolvedValue({ StatusCode: 500 });

      await expect(
        service.publishVoiceSessionEvent('session123', 'error')
      ).rejects.toThrow('Lambda invocation failed with status: 500');

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
    });

    it('should handle missing function name configuration', async () => {
      const serviceWithoutFunction = new AppSyncEventsService('', 'us-east-1');

      await expect(
        serviceWithoutFunction.publishUIControlEvent('user123', 'show', 'panel')
      ).rejects.toThrow();
    });
  });

  describe('Event Routing Requirements', () => {
    it('should satisfy requirement 9.1 - UI control and display management', async () => {
      // Test showing notes
      await service.publishUIControlEvent('user123', 'show', 'notes', {
        noteId: 'note1',
        content: 'Test note content',
      });

      // Test hiding notes
      await service.publishUIControlEvent('user123', 'hide', 'notes', {
        noteId: 'note1',
      });

      // Test showing rich content with markdown
      await service.publishUIControlEvent('user123', 'show', 'rich-content', {
        markdown: '# Title\n\nContent with **bold** text',
        images: ['image1.jpg'],
        mermaid: 'graph TD; A-->B;',
      });

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(3);
    });

    it('should satisfy requirement 9.4 - Real-time UI updates through events', async () => {
      // Test real-time voice session updates
      await service.publishVoiceSessionEvent('session123', 'processing', {
        progress: 0.5,
        transcript: 'Partial transcript...',
      });

      // Test real-time chat updates
      await service.publishChatEvent('user123', {
        type: 'ai_response',
        content: 'AI generated response',
        streaming: true,
      });

      // Test real-time media content updates
      await service.publishUIControlEvent('user123', 'update', 'media-gallery', {
        newImages: ['generated-image.jpg'],
        newVideos: ['generated-video.mp4'],
      });

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration with WebSocket and Nova Sonic', () => {
    it('should handle voice session lifecycle events', async () => {
      const sessionId = 'nova-sonic-session-123';

      // Session started
      await service.publishVoiceSessionEvent(sessionId, 'started', {
        novaSonicSessionId: 'ns-123',
        audioFormat: 'webm',
      });

      // Processing audio
      await service.publishVoiceSessionEvent(sessionId, 'processing', {
        transcript: 'Hello, how can I help you?',
        confidence: 0.95,
      });

      // AI response ready
      await service.publishVoiceSessionEvent(sessionId, 'response_ready', {
        response: 'I can help you with that task.',
        audioUrl: 's3://bucket/audio-response.mp3',
      });

      // Session completed
      await service.publishVoiceSessionEvent(sessionId, 'completed', {
        duration: 45.2,
        totalMessages: 3,
      });

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(4);
    });

    it('should handle dynamic content generation events', async () => {
      const userId = 'user123';

      // AI generates a note
      await service.publishNotesEvent(userId, 'ai-note-123', 'create', {
        title: 'AI Generated Summary',
        content: 'Based on our conversation...',
        source: 'voice_interaction',
      });

      // AI generates an image
      await service.publishUIControlEvent(userId, 'show', 'generated-image', {
        imageUrl: 's3://bucket/generated-image.jpg',
        prompt: 'A beautiful sunset over mountains',
        generatedBy: 'bedrock-titan',
      });

      // AI updates existing content
      await service.publishNotesEvent(userId, 'ai-note-123', 'update', {
        additionalContent: 'Additional insights from the AI...',
        updatedBy: 'ai_assistant',
      });

      expect(mockLambdaClient.send).toHaveBeenCalledTimes(3);
    });
  });
});