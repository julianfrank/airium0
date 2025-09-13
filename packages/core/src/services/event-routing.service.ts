import { AppSyncEventsService } from './appsync-events.service';

/**
 * Event routing service that manages the flow of events between different components
 * and ensures proper event routing based on user permissions and context.
 */
export class EventRoutingService {
  private appSyncEvents: AppSyncEventsService;

  constructor(eventPublisherFunctionName: string, region: string = 'us-east-1') {
    this.appSyncEvents = new AppSyncEventsService(eventPublisherFunctionName, region);
  }

  /**
   * Route voice session events to appropriate subscribers
   */
  async routeVoiceSessionEvent(
    sessionId: string,
    status: string,
    data?: any,
    userId?: string
  ): Promise<void> {
    console.log(`Routing voice session event: ${sessionId} - ${status}`);

    // Publish to AppSync for real-time subscriptions
    await this.appSyncEvents.publishVoiceSessionEvent(sessionId, status, data);

    // Handle specific voice session states
    switch (status) {
      case 'started':
        await this.handleVoiceSessionStarted(sessionId, data, userId);
        break;
      case 'processing':
        await this.handleVoiceProcessing(sessionId, data, userId);
        break;
      case 'response_ready':
        await this.handleVoiceResponse(sessionId, data, userId);
        break;
      case 'completed':
        await this.handleVoiceSessionCompleted(sessionId, data, userId);
        break;
      case 'error':
        await this.handleVoiceSessionError(sessionId, data, userId);
        break;
    }
  }

  /**
   * Route chat events with AI processing context
   */
  async routeChatEvent(
    userId: string,
    message: any,
    context?: { sessionId?: string; applicationId?: string }
  ): Promise<void> {
    console.log(`Routing chat event for user: ${userId}`);

    // Publish chat event
    await this.appSyncEvents.publishChatEvent(userId, message);

    // Handle different message types
    if (message.type === 'ai_response') {
      await this.handleAIResponse(userId, message, context);
    } else if (message.type === 'user_input') {
      await this.handleUserInput(userId, message, context);
    }
  }

  /**
   * Route UI control events for dynamic interface management
   */
  async routeUIControlEvent(
    userId: string,
    action: 'show' | 'hide' | 'update' | 'remove',
    target: string,
    content?: any
  ): Promise<void> {
    console.log(`Routing UI control event: ${action} ${target} for user ${userId}`);

    // Create event for logging/tracking purposes
    console.log(`UI Control Event: ${action} ${target} for user ${userId}`);

    await this.appSyncEvents.publishUIControlEvent(userId, action, target, content);

    // Handle specific UI control actions
    switch (action) {
      case 'show':
        await this.handleShowContent(userId, target, content);
        break;
      case 'hide':
        await this.handleHideContent(userId, target, content);
        break;
      case 'update':
        await this.handleUpdateContent(userId, target, content);
        break;
      case 'remove':
        await this.handleRemoveContent(userId, target, content);
        break;
    }
  }

  /**
   * Route notes events for content management
   */
  async routeNotesEvent(
    userId: string,
    noteId: string,
    action: 'create' | 'update' | 'delete' | 'show' | 'hide',
    content?: any
  ): Promise<void> {
    console.log(`Routing notes event: ${action} note ${noteId} for user ${userId}`);

    // Create event for logging/tracking purposes
    console.log(`Notes Event: ${action} note ${noteId} for user ${userId}`);

    await this.appSyncEvents.publishNotesEvent(userId, noteId, action, content);

    // Handle specific note actions
    switch (action) {
      case 'create':
        await this.handleNoteCreated(userId, noteId, content);
        break;
      case 'update':
        await this.handleNoteUpdated(userId, noteId, content);
        break;
      case 'delete':
        await this.handleNoteDeleted(userId, noteId, content);
        break;
      case 'show':
        await this.handleNoteShown(userId, noteId, content);
        break;
      case 'hide':
        await this.handleNoteHidden(userId, noteId, content);
        break;
    }
  }

  /**
   * Route application-specific events
   */
  async routeApplicationEvent(
    userId: string,
    applicationId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    console.log(`Routing application event: ${eventType} for app ${applicationId}`);

    await this.appSyncEvents.publishEvent(
      `application_${eventType}`,
      { applicationId, ...payload },
      payload.connectionId || ''
    );
  }

  // Private event handlers

  private async handleVoiceSessionStarted(
    sessionId: string,
    data: any,
    userId?: string
  ): Promise<void> {
    if (userId) {
      // Show voice session UI
      await this.routeUIControlEvent(userId, 'show', 'voice-session', {
        sessionId,
        status: 'active',
        audioFormat: data?.audioFormat,
      });
    }
  }

  private async handleVoiceProcessing(
    sessionId: string,
    data: any,
    userId?: string
  ): Promise<void> {
    if (userId && data?.transcript) {
      // Update UI with partial transcript
      await this.routeUIControlEvent(userId, 'update', 'voice-transcript', {
        sessionId,
        transcript: data.transcript,
        confidence: data.confidence,
      });
    }
  }

  private async handleVoiceResponse(
    sessionId: string,
    data: any,
    userId?: string
  ): Promise<void> {
    if (userId) {
      // Show AI response in UI
      await this.routeUIControlEvent(userId, 'show', 'ai-response', {
        sessionId,
        response: data?.response,
        audioUrl: data?.audioUrl,
      });

      // If AI generated content, create a note
      if (data?.generatedContent) {
        const noteId = `ai-note-${Date.now()}`;
        await this.routeNotesEvent(userId, noteId, 'create', {
          title: 'AI Generated Content',
          content: data.generatedContent,
          source: 'voice_interaction',
          sessionId,
        });
      }
    }
  }

  private async handleVoiceSessionCompleted(
    sessionId: string,
    data: any,
    userId?: string
  ): Promise<void> {
    if (userId) {
      // Hide voice session UI
      await this.routeUIControlEvent(userId, 'hide', 'voice-session', {
        sessionId,
        status: 'completed',
        duration: data?.duration,
      });

      // Show session summary if available
      if (data?.summary) {
        const noteId = `session-summary-${sessionId}`;
        await this.routeNotesEvent(userId, noteId, 'create', {
          title: 'Voice Session Summary',
          content: data.summary,
          sessionId,
          duration: data.duration,
        });
      }
    }
  }

  private async handleVoiceSessionError(
    sessionId: string,
    data: any,
    userId?: string
  ): Promise<void> {
    if (userId) {
      // Show error message
      await this.routeUIControlEvent(userId, 'show', 'error-message', {
        sessionId,
        error: data?.error || 'Voice session error occurred',
        type: 'voice_session_error',
      });
    }
  }

  private async handleAIResponse(
    userId: string,
    message: any,
    context?: { sessionId?: string; applicationId?: string }
  ): Promise<void> {
    // If AI response contains rich content, show it in UI
    if (message.richContent) {
      await this.routeUIControlEvent(userId, 'show', 'rich-content', {
        content: message.richContent,
        messageId: message.id,
        sessionId: context?.sessionId,
      });
    }

    // If AI generated media, show it
    if (message.generatedMedia) {
      await this.routeUIControlEvent(userId, 'show', 'generated-media', {
        media: message.generatedMedia,
        messageId: message.id,
        sessionId: context?.sessionId,
      });
    }
  }

  private async handleUserInput(
    userId: string,
    message: any,
    _context?: { sessionId?: string; applicationId?: string }
  ): Promise<void> {
    // Log user input for analytics (without PII)
    console.log(`User input received for ${userId}: type=${message.type}, length=${message.content?.length}`);
  }

  private async handleShowContent(userId: string, target: string, _content: any): Promise<void> {
    console.log(`Showing ${target} for user ${userId}`);
  }

  private async handleHideContent(userId: string, target: string, _content: any): Promise<void> {
    console.log(`Hiding ${target} for user ${userId}`);
  }

  private async handleUpdateContent(userId: string, target: string, _content: any): Promise<void> {
    console.log(`Updating ${target} for user ${userId}`);
  }

  private async handleRemoveContent(userId: string, target: string, _content: any): Promise<void> {
    console.log(`Removing ${target} for user ${userId}`);
  }

  private async handleNoteCreated(userId: string, noteId: string, content: any): Promise<void> {
    // Show the newly created note
    await this.routeUIControlEvent(userId, 'show', 'note', {
      noteId,
      ...content,
    });
  }

  private async handleNoteUpdated(userId: string, noteId: string, content: any): Promise<void> {
    // Update the note display
    await this.routeUIControlEvent(userId, 'update', 'note', {
      noteId,
      ...content,
    });
  }

  private async handleNoteDeleted(userId: string, noteId: string, _content: any): Promise<void> {
    // Remove the note from display
    await this.routeUIControlEvent(userId, 'remove', 'note', {
      noteId,
    });
  }

  private async handleNoteShown(userId: string, noteId: string, content: any): Promise<void> {
    // Show the note in UI
    await this.routeUIControlEvent(userId, 'show', 'note', {
      noteId,
      ...content,
    });
  }

  private async handleNoteHidden(userId: string, noteId: string, _content: any): Promise<void> {
    // Hide the note from UI
    await this.routeUIControlEvent(userId, 'hide', 'note', {
      noteId,
    });
  }
}