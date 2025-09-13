import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventRoutingService } from '../services/event-routing.service';

// Mock the AppSyncEventsService
vi.mock('../services/appsync-events.service', () => ({
  AppSyncEventsService: vi.fn().mockImplementation(() => ({
    publishVoiceSessionEvent: vi.fn().mockResolvedValue(undefined),
    publishChatEvent: vi.fn().mockResolvedValue(undefined),
    publishUIControlEvent: vi.fn().mockResolvedValue(undefined),
    publishNotesEvent: vi.fn().mockResolvedValue(undefined),
    publishEvent: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('EventRoutingService', () => {
  let service: EventRoutingService;
  let mockAppSyncEvents: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventRoutingService('test-function', 'us-east-1');
    // Get the mocked AppSyncEventsService instance
    mockAppSyncEvents = (service as any).appSyncEvents;
  });

  describe('Voice Session Event Routing', () => {
    it('should route voice session started event and show UI', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const data = { audioFormat: 'webm' };

      await service.routeVoiceSessionEvent(sessionId, 'started', data, userId);

      expect(mockAppSyncEvents.publishVoiceSessionEvent).toHaveBeenCalledWith(
        sessionId,
        'started',
        data
      );
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'show',
        'voice-session',
        {
          sessionId,
          status: 'active',
          audioFormat: 'webm',
        }
      );
    });

    it('should route voice processing event and update transcript', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const data = { transcript: 'Hello world', confidence: 0.95 };

      await service.routeVoiceSessionEvent(sessionId, 'processing', data, userId);

      expect(mockAppSyncEvents.publishVoiceSessionEvent).toHaveBeenCalledWith(
        sessionId,
        'processing',
        data
      );
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'update',
        'voice-transcript',
        {
          sessionId,
          transcript: 'Hello world',
          confidence: 0.95,
        }
      );
    });

    it('should route voice response event and create note for generated content', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const data = {
        response: 'AI response',
        audioUrl: 's3://bucket/audio.mp3',
        generatedContent: 'Generated summary content',
      };

      await service.routeVoiceSessionEvent(sessionId, 'response_ready', data, userId);

      expect(mockAppSyncEvents.publishVoiceSessionEvent).toHaveBeenCalledWith(
        sessionId,
        'response_ready',
        data
      );
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'show',
        'ai-response',
        {
          sessionId,
          response: 'AI response',
          audioUrl: 's3://bucket/audio.mp3',
        }
      );
      expect(mockAppSyncEvents.publishNotesEvent).toHaveBeenCalledWith(
        userId,
        expect.stringMatching(/^ai-note-\d+$/),
        'create',
        {
          title: 'AI Generated Content',
          content: 'Generated summary content',
          source: 'voice_interaction',
          sessionId,
        }
      );
    });

    it('should route voice session completed event and create summary', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const data = {
        duration: 45.2,
        summary: 'Session summary content',
      };

      await service.routeVoiceSessionEvent(sessionId, 'completed', data, userId);

      expect(mockAppSyncEvents.publishVoiceSessionEvent).toHaveBeenCalledWith(
        sessionId,
        'completed',
        data
      );
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'hide',
        'voice-session',
        {
          sessionId,
          status: 'completed',
          duration: 45.2,
        }
      );
      expect(mockAppSyncEvents.publishNotesEvent).toHaveBeenCalledWith(
        userId,
        `session-summary-${sessionId}`,
        'create',
        {
          title: 'Voice Session Summary',
          content: 'Session summary content',
          sessionId,
          duration: 45.2,
        }
      );
    });

    it('should route voice session error event and show error message', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const data = { error: 'Audio processing failed' };

      await service.routeVoiceSessionEvent(sessionId, 'error', data, userId);

      expect(mockAppSyncEvents.publishVoiceSessionEvent).toHaveBeenCalledWith(
        sessionId,
        'error',
        data
      );
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'show',
        'error-message',
        {
          sessionId,
          error: 'Audio processing failed',
          type: 'voice_session_error',
        }
      );
    });
  });

  describe('Chat Event Routing', () => {
    it('should route AI response with rich content', async () => {
      const userId = 'user-123';
      const message = {
        id: 'msg-123',
        type: 'ai_response',
        content: 'AI response text',
        richContent: {
          markdown: '# Title\n\nContent',
          images: ['image1.jpg'],
        },
      };
      const context = { sessionId: 'session-123' };

      await service.routeChatEvent(userId, message, context);

      expect(mockAppSyncEvents.publishChatEvent).toHaveBeenCalledWith(userId, message);
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'show',
        'rich-content',
        {
          content: message.richContent,
          messageId: 'msg-123',
          sessionId: 'session-123',
        }
      );
    });

    it('should route AI response with generated media', async () => {
      const userId = 'user-123';
      const message = {
        id: 'msg-123',
        type: 'ai_response',
        content: 'AI generated an image',
        generatedMedia: {
          images: ['generated-image.jpg'],
          videos: ['generated-video.mp4'],
        },
      };

      await service.routeChatEvent(userId, message);

      expect(mockAppSyncEvents.publishChatEvent).toHaveBeenCalledWith(userId, message);
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'show',
        'generated-media',
        {
          media: message.generatedMedia,
          messageId: 'msg-123',
          sessionId: undefined,
        }
      );
    });
  });

  describe('UI Control Event Routing', () => {
    it('should route show content events', async () => {
      const userId = 'user-123';
      const content = { noteId: 'note-123', title: 'Test Note' };

      await service.routeUIControlEvent(userId, 'show', 'notes-panel', content);

      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'show',
        'notes-panel',
        content
      );
    });

    it('should route hide content events', async () => {
      const userId = 'user-123';

      await service.routeUIControlEvent(userId, 'hide', 'notes-panel');

      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'hide',
        'notes-panel',
        undefined
      );
    });

    it('should route update content events', async () => {
      const userId = 'user-123';
      const content = { progress: 0.75 };

      await service.routeUIControlEvent(userId, 'update', 'progress-bar', content);

      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'update',
        'progress-bar',
        content
      );
    });

    it('should route remove content events', async () => {
      const userId = 'user-123';
      const content = { elementId: 'temp-element' };

      await service.routeUIControlEvent(userId, 'remove', 'temporary-content', content);

      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'remove',
        'temporary-content',
        content
      );
    });
  });

  describe('Notes Event Routing', () => {
    it('should route note creation and show in UI', async () => {
      const userId = 'user-123';
      const noteId = 'note-123';
      const content = { title: 'Test Note', markdown: '# Content' };

      await service.routeNotesEvent(userId, noteId, 'create', content);

      expect(mockAppSyncEvents.publishNotesEvent).toHaveBeenCalledWith(
        userId,
        noteId,
        'create',
        content
      );
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'show',
        'note',
        {
          noteId,
          ...content,
        }
      );
    });

    it('should route note updates and update UI', async () => {
      const userId = 'user-123';
      const noteId = 'note-123';
      const content = { additionalContent: 'Updated content' };

      await service.routeNotesEvent(userId, noteId, 'update', content);

      expect(mockAppSyncEvents.publishNotesEvent).toHaveBeenCalledWith(
        userId,
        noteId,
        'update',
        content
      );
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'update',
        'note',
        {
          noteId,
          ...content,
        }
      );
    });

    it('should route note deletion and remove from UI', async () => {
      const userId = 'user-123';
      const noteId = 'note-123';

      await service.routeNotesEvent(userId, noteId, 'delete');

      expect(mockAppSyncEvents.publishNotesEvent).toHaveBeenCalledWith(
        userId,
        noteId,
        'delete',
        undefined
      );
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledWith(
        userId,
        'remove',
        'note',
        {
          noteId,
        }
      );
    });
  });

  describe('Application Event Routing', () => {
    it('should route application events with proper formatting', async () => {
      const userId = 'user-123';
      const applicationId = 'app-123';
      const eventType = 'launched';
      const payload = {
        connectionId: 'conn-123',
        timestamp: new Date().toISOString(),
      };

      await service.routeApplicationEvent(userId, applicationId, eventType, payload);

      expect(mockAppSyncEvents.publishEvent).toHaveBeenCalledWith(
        'application_launched',
        {
          applicationId,
          ...payload,
        },
        'conn-123'
      );
    });
  });

  describe('Requirements Satisfaction', () => {
    it('should satisfy requirement 9.1 - UI control and display management', async () => {
      const userId = 'user-123';

      // Show notes
      await service.routeUIControlEvent(userId, 'show', 'notes', {
        noteId: 'note1',
        content: 'Test note',
      });

      // Show rich content with markdown
      await service.routeUIControlEvent(userId, 'show', 'rich-content', {
        markdown: '# Title\n\nContent with **bold** text',
        images: ['image1.jpg'],
        mermaid: 'graph TD; A-->B;',
      });

      // Remove content
      await service.routeUIControlEvent(userId, 'remove', 'temporary-element');

      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledTimes(3);
    });

    it('should satisfy requirement 9.4 - Real-time UI updates through events', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';

      // Real-time voice session updates
      await service.routeVoiceSessionEvent(sessionId, 'processing', {
        transcript: 'Real-time transcript',
        progress: 0.5,
      }, userId);

      // Real-time chat updates
      await service.routeChatEvent(userId, {
        type: 'ai_response',
        content: 'Streaming AI response',
        streaming: true,
      });

      // Real-time content updates
      await service.routeUIControlEvent(userId, 'update', 'live-content', {
        data: 'Updated data',
        timestamp: new Date().toISOString(),
      });

      expect(mockAppSyncEvents.publishVoiceSessionEvent).toHaveBeenCalledTimes(1);
      expect(mockAppSyncEvents.publishChatEvent).toHaveBeenCalledTimes(1);
      expect(mockAppSyncEvents.publishUIControlEvent).toHaveBeenCalledTimes(2); // One from voice processing, one from direct call
    });
  });
});