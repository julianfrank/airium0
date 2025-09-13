import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

/**
 * Utility function to publish events to AppSync Events
 * This can be used by other Lambda functions to publish real-time events
 */
export class EventPublisher {
  private static lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
  private static eventPublisherFunctionName = process.env.EVENT_PUBLISHER_FUNCTION_NAME;

  /**
   * Publish a UI control event for dynamic UI updates
   */
  static async publishUIControlEvent(userId: string, action: string, target: string, content?: any): Promise<void> {
    const event = {
      eventType: 'ui_control_event',
      userId,
      payload: {
        action,
        target,
        content,
      },
    };

    await this.invokeEventPublisher(event);
  }

  /**
   * Publish a notes event for showing/hiding/updating notes
   */
  static async publishNotesEvent(userId: string, noteId: string, action: string, content?: any): Promise<void> {
    const event = {
      eventType: 'notes_event',
      userId,
      payload: {
        noteId,
        action,
        content,
      },
    };

    await this.invokeEventPublisher(event);
  }

  /**
   * Publish a voice session event
   */
  static async publishVoiceSessionEvent(sessionId: string, status: string, data?: any): Promise<void> {
    const event = {
      eventType: 'voice_session_event',
      sessionId,
      payload: {
        status,
        data,
      },
    };

    await this.invokeEventPublisher(event);
  }

  /**
   * Publish a chat event
   */
  static async publishChatEvent(userId: string, message: any): Promise<void> {
    const event = {
      eventType: 'chat_event',
      userId,
      payload: {
        message,
      },
    };

    await this.invokeEventPublisher(event);
  }

  /**
   * Publish a general event
   */
  static async publishGeneralEvent(eventType: string, payload: any, userId: string): Promise<void> {
    const event = {
      eventType: 'general_event',
      userId,
      payload: {
        type: eventType,
        data: payload,
      },
    };

    await this.invokeEventPublisher(event);
  }

  private static async invokeEventPublisher(event: any): Promise<void> {
    if (!this.eventPublisherFunctionName) {
      console.warn('EVENT_PUBLISHER_FUNCTION_NAME not set, skipping event publication');
      return;
    }

    try {
      const command = new InvokeCommand({
        FunctionName: this.eventPublisherFunctionName,
        Payload: JSON.stringify(event),
      });

      const response = await this.lambdaClient.send(command);
      
      if (response.StatusCode !== 200) {
        throw new Error(`Lambda invocation failed with status: ${response.StatusCode}`);
      }

      console.log('Event published successfully:', event.eventType);
    } catch (error) {
      console.error('Error publishing event:', error);
      // Don't throw error to avoid breaking the main function
      // Events are supplementary functionality
    }
  }
}