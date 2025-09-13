import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { AppSyncEventService } from '@airium/shared';

export class AppSyncEventsService implements AppSyncEventService {
  private lambdaClient: LambdaClient;
  private eventPublisherFunctionName: string;

  constructor(eventPublisherFunctionName: string, region: string = 'us-east-1') {
    this.lambdaClient = new LambdaClient({ region });
    this.eventPublisherFunctionName = eventPublisherFunctionName;
  }

  async publishEvent(eventType: string, payload: any, connectionId: string): Promise<void> {
    const event = {
      eventType: 'general_event',
      payload: {
        type: eventType,
        data: payload,
      },
      connectionId,
    };

    await this.invokeLambda(event);
  }

  async publishVoiceSessionEvent(sessionId: string, status: string, data?: any): Promise<void> {
    const event = {
      eventType: 'voice_session_event',
      sessionId,
      payload: {
        status,
        data,
      },
    };

    await this.invokeLambda(event);
  }

  async publishChatEvent(userId: string, message: any): Promise<void> {
    const event = {
      eventType: 'chat_event',
      userId,
      payload: {
        message,
      },
    };

    await this.invokeLambda(event);
  }

  async publishUIControlEvent(userId: string, action: string, target: string, content?: any): Promise<void> {
    const event = {
      eventType: 'ui_control_event',
      userId,
      payload: {
        action,
        target,
        content,
      },
    };

    await this.invokeLambda(event);
  }

  async publishNotesEvent(userId: string, noteId: string, action: string, content?: any): Promise<void> {
    const event = {
      eventType: 'notes_event',
      userId,
      payload: {
        noteId,
        action,
        content,
      },
    };

    await this.invokeLambda(event);
  }

  private async invokeLambda(event: any): Promise<void> {
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
      console.error('Error invoking event publisher Lambda:', error);
      throw error;
    }
  }
}