import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { NovaSonicService, VoiceResponse } from '@airium/shared';

/**
 * Nova Sonic service implementation for voice processing
 * Integrates with Nova Sonic Lambda functions for audio processing
 */
export class NovaSonicServiceImpl implements NovaSonicService {
  private lambdaClient: LambdaClient;
  private processorFunctionName: string;
  private sessionManagerFunctionName: string;

  constructor(
    processorFunctionName: string,
    sessionManagerFunctionName: string,
    region: string = 'us-east-1'
  ) {
    this.lambdaClient = new LambdaClient({ region });
    this.processorFunctionName = processorFunctionName;
    this.sessionManagerFunctionName = sessionManagerFunctionName;
  }

  async initializeBidirectionalStream(connectionId: string, userId: string): Promise<string> {
    try {
      console.log(`Initializing Nova Sonic session for user: ${userId}, connection: ${connectionId}`);

      const sessionId = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Initialize session through processor
      const command = new InvokeCommand({
        FunctionName: this.processorFunctionName,
        Payload: JSON.stringify({
          connectionId,
          sessionId,
          userId,
          messageType: 'voice_session_start',
          audioFormat: 'webm',
          processingOptions: {
            streaming: true,
            language: 'en-US',
            model: 'claude-3-haiku',
          },
        }),
      });

      const response = await this.lambdaClient.send(command);

      if (response.StatusCode !== 200) {
        throw new Error(`Failed to initialize session: ${response.StatusCode}`);
      }

      console.log(`Nova Sonic session initialized: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error('Error initializing Nova Sonic session:', error);
      throw error;
    }
  }

  async processAudioData(audioData: string, sessionId: string): Promise<VoiceResponse> {
    try {
      console.log(`Processing audio data for session: ${sessionId}`);

      // Get session info to get connection details
      const sessionInfo = await this.getSessionInfo(sessionId);
      if (!sessionInfo) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const command = new InvokeCommand({
        FunctionName: this.processorFunctionName,
        Payload: JSON.stringify({
          connectionId: sessionInfo.connectionId,
          sessionId,
          userId: sessionInfo.userId,
          messageType: 'voice_data_process',
          audioData,
          processingOptions: {
            streaming: true,
            language: 'en-US',
            model: 'claude-3-haiku',
          },
        }),
      });

      const response = await this.lambdaClient.send(command);

      if (response.StatusCode !== 200) {
        throw new Error(`Failed to process audio: ${response.StatusCode}`);
      }

      // Parse response payload
      let responseData: any = {};
      if (response.Payload) {
        responseData = JSON.parse(new TextDecoder().decode(response.Payload));
      }

      // Return voice response (in real implementation, this would come from the Lambda response)
      return {
        type: 'voice_response',
        sessionId,
        text: 'Processed audio response', // This would be the actual transcription/response
        audio: 'base64-encoded-audio-response', // This would be the actual audio response
        timestamp: new Date().toISOString(),
        status: 'completed',
        data: {
          processingTime: Date.now(),
          model: 'claude-3-haiku',
          language: 'en-US',
        },
      };
    } catch (error) {
      console.error('Error processing audio data:', error);
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      console.log(`Ending Nova Sonic session: ${sessionId}`);

      // Get session info to get connection details
      const sessionInfo = await this.getSessionInfo(sessionId);
      if (!sessionInfo) {
        console.warn(`Session not found for ending: ${sessionId}`);
        return;
      }

      const command = new InvokeCommand({
        FunctionName: this.processorFunctionName,
        Payload: JSON.stringify({
          connectionId: sessionInfo.connectionId,
          sessionId,
          messageType: 'voice_session_end',
        }),
      });

      const response = await this.lambdaClient.send(command);

      if (response.StatusCode !== 200) {
        throw new Error(`Failed to end session: ${response.StatusCode}`);
      }

      console.log(`Nova Sonic session ended: ${sessionId}`);
    } catch (error) {
      console.error('Error ending Nova Sonic session:', error);
      throw error;
    }
  }

  async sendVoiceResponse(response: string, connectionId: string): Promise<void> {
    try {
      console.log(`Sending voice response to connection: ${connectionId}`);

      // This would typically be handled by the processor function
      // For now, we'll use the synthesize function
      const command = new InvokeCommand({
        FunctionName: this.processorFunctionName,
        Payload: JSON.stringify({
          connectionId,
          sessionId: `temp-${Date.now()}`, // Temporary session for synthesis
          messageType: 'voice_synthesize',
          textInput: response,
          processingOptions: {
            language: 'en-US',
            voice: 'default',
          },
        }),
      });

      const lambdaResponse = await this.lambdaClient.send(command);

      if (lambdaResponse.StatusCode !== 200) {
        throw new Error(`Failed to send voice response: ${lambdaResponse.StatusCode}`);
      }

      console.log(`Voice response sent to connection: ${connectionId}`);
    } catch (error) {
      console.error('Error sending voice response:', error);
      throw error;
    }
  }

  // Additional utility methods

  async transcribeAudio(audioData: string, sessionId: string, options: { language?: string } = {}): Promise<string> {
    try {
      console.log(`Transcribing audio for session: ${sessionId}`);

      const sessionInfo = await this.getSessionInfo(sessionId);
      if (!sessionInfo) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const command = new InvokeCommand({
        FunctionName: this.processorFunctionName,
        Payload: JSON.stringify({
          connectionId: sessionInfo.connectionId,
          sessionId,
          messageType: 'voice_transcribe',
          audioData,
          processingOptions: {
            language: options.language || 'en-US',
          },
        }),
      });

      const response = await this.lambdaClient.send(command);

      if (response.StatusCode !== 200) {
        throw new Error(`Failed to transcribe audio: ${response.StatusCode}`);
      }

      // In a real implementation, this would return the actual transcription
      return 'Transcribed text from audio';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  async synthesizeVoice(text: string, sessionId: string, options: { language?: string; voice?: string } = {}): Promise<string> {
    try {
      console.log(`Synthesizing voice for session: ${sessionId}`);

      const sessionInfo = await this.getSessionInfo(sessionId);
      if (!sessionInfo) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const command = new InvokeCommand({
        FunctionName: this.processorFunctionName,
        Payload: JSON.stringify({
          connectionId: sessionInfo.connectionId,
          sessionId,
          messageType: 'voice_synthesize',
          textInput: text,
          processingOptions: {
            language: options.language || 'en-US',
            voice: options.voice || 'default',
          },
        }),
      });

      const response = await this.lambdaClient.send(command);

      if (response.StatusCode !== 200) {
        throw new Error(`Failed to synthesize voice: ${response.StatusCode}`);
      }

      // In a real implementation, this would return the actual audio data
      return 'base64-encoded-synthesized-audio';
    } catch (error) {
      console.error('Error synthesizing voice:', error);
      throw error;
    }
  }

  async listUserSessions(userId: string): Promise<any[]> {
    try {
      console.log(`Listing voice sessions for user: ${userId}`);

      const command = new InvokeCommand({
        FunctionName: this.sessionManagerFunctionName,
        Payload: JSON.stringify({
          action: 'list',
          userId,
        }),
      });

      const response = await this.lambdaClient.send(command);

      if (response.StatusCode !== 200) {
        throw new Error(`Failed to list sessions: ${response.StatusCode}`);
      }

      let responseData: any = { sessions: [] };
      if (response.Payload) {
        const payload = JSON.parse(new TextDecoder().decode(response.Payload));
        responseData = JSON.parse(payload.body);
      }

      return responseData.sessions || [];
    } catch (error) {
      console.error('Error listing user sessions:', error);
      throw error;
    }
  }

  private async getSessionInfo(sessionId: string): Promise<any> {
    try {
      const command = new InvokeCommand({
        FunctionName: this.sessionManagerFunctionName,
        Payload: JSON.stringify({
          action: 'get',
          sessionId,
        }),
      });

      const response = await this.lambdaClient.send(command);

      if (response.StatusCode !== 200) {
        return null;
      }

      if (response.Payload) {
        const payload = JSON.parse(new TextDecoder().decode(response.Payload));
        return JSON.parse(payload.body);
      }

      return null;
    } catch (error) {
      console.error('Error getting session info:', error);
      return null;
    }
  }

  // Interface methods implementation
  async invokeModelWithBidirectionalStream(modelId: string, body: any): Promise<any> {
    try {
      const command = new InvokeCommand({
        FunctionName: this.processorFunctionName,
        Payload: JSON.stringify({
          modelId,
          body,
          messageType: 'model_invoke',
        }),
      });

      const response = await this.lambdaClient.send(command);

      if (response.StatusCode !== 200) {
        throw new Error(`Failed to invoke model: ${response.StatusCode}`);
      }

      if (response.Payload) {
        return JSON.parse(new TextDecoder().decode(response.Payload));
      }

      return {};
    } catch (error) {
      console.error('Error invoking model:', error);
      throw error;
    }
  }

  generateOrderedStream(initialRequest?: any): any {
    // Return a stream-like object for ordered processing
    return {
      sessionId: `stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      initialRequest,
      status: 'initialized',
    };
  }

  async processAudioStream(audioChunk: Buffer, streamId: string): Promise<void> {
    try {
      const audioData = audioChunk.toString('base64');
      await this.processAudioData(audioData, streamId);
    } catch (error) {
      console.error('Error processing audio stream:', error);
      throw error;
    }
  }

  async handleStreamResponse(response: any, connectionId: string): Promise<void> {
    try {
      const command = new InvokeCommand({
        FunctionName: this.processorFunctionName,
        Payload: JSON.stringify({
          connectionId,
          messageType: 'stream_response',
          response,
        }),
      });

      await this.lambdaClient.send(command);
    } catch (error) {
      console.error('Error handling stream response:', error);
      throw error;
    }
  }

  async closeBidirectionalStream(streamId: string): Promise<void> {
    try {
      await this.endSession(streamId);
    } catch (error) {
      console.error('Error closing bidirectional stream:', error);
      throw error;
    }
  }

  // Legacy methods for backward compatibility
  async initializeSession(connectionId: string, userId: string): Promise<string> {
    return this.initializeBidirectionalStream(connectionId, userId);
  }
}