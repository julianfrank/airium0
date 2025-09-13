import { Handler } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand, InvokeModelWithBidirectionalStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { AudioStreamProcessor } from './audio-streaming';
import { ConversationContextManager } from './conversation-context';

const WEBSOCKET_API_ID = process.env.WEBSOCKET_API_ID!;
const VOICE_SESSIONS_TABLE_NAME = process.env.VOICE_SESSIONS_TABLE_NAME!;
const AUDIO_STORAGE_BUCKET = process.env.AUDIO_STORAGE_BUCKET!;
const region = process.env.AWS_REGION || 'us-east-1';

const apiGatewayClient = new ApiGatewayManagementApiClient({
  endpoint: `https://${WEBSOCKET_API_ID}.execute-api.${region}.amazonaws.com/prod`,
});

const bedrockClient = new BedrockRuntimeClient({ region });
const lambdaClient = new LambdaClient({ region });
const s3Client = new S3Client({ region });

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Initialize audio stream processor and conversation context manager
const audioProcessor = new AudioStreamProcessor(process.env.AUDIO_STORAGE_BUCKET!);
const contextManager = new ConversationContextManager(process.env.VOICE_SESSIONS_TABLE_NAME!);

interface VoiceProcessingEvent {
  connectionId: string;
  sessionId: string;
  userId: string;
  messageType: 'voice_session_start' | 'voice_data_process' | 'voice_session_end' | 'voice_transcribe' | 'voice_synthesize' | 'voice_chunk_process';
  audioData?: string;
  textInput?: string;
  audioFormat?: string;
  sequenceNumber?: number;
  processingOptions?: {
    streaming?: boolean;
    language?: string;
    model?: string;
  };
}

export const handler: Handler = async (event: VoiceProcessingEvent) => {
  console.log('Nova Sonic processor event:', JSON.stringify({ ...event, audioData: event.audioData ? '[AUDIO_DATA]' : undefined }, null, 2));

  try {
    const { connectionId, sessionId, userId, messageType, audioData, textInput, audioFormat, processingOptions } = event;

    switch (messageType) {
      case 'voice_session_start':
        return await initializeVoiceSession(connectionId, sessionId, userId, { audioFormat, ...processingOptions });
      case 'voice_data_process':
        return await processVoiceData(connectionId, sessionId, audioData!, processingOptions);
      case 'voice_chunk_process':
        return await processVoiceChunk(connectionId, sessionId, audioData!, event.sequenceNumber || 0, processingOptions);
      case 'voice_transcribe':
        return await transcribeAudio(connectionId, sessionId, audioData!, processingOptions);
      case 'voice_synthesize':
        return await synthesizeVoice(connectionId, sessionId, textInput!, processingOptions);
      case 'voice_session_end':
        return await endVoiceSession(connectionId, sessionId);
      default:
        console.log(`Unknown message type: ${messageType}`);
        return { statusCode: 400, body: 'Unknown message type' };
    }
  } catch (error) {
    console.error('Error in Nova Sonic processor:', error);
    
    // Send error to client
    try {
      await sendToConnection(event.connectionId, {
        type: 'voice_error',
        sessionId: event.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } catch (sendError) {
      console.error('Failed to send error to client:', sendError);
    }
    
    return { statusCode: 500, body: 'Internal server error' };
  }
};

async function initializeVoiceSession(
  connectionId: string, 
  sessionId: string, 
  userId: string,
  options: { audioFormat?: string; streaming?: boolean; language?: string; model?: string } = {}
) {
  console.log(`Initializing Nova Sonic session: ${sessionId} for connection: ${connectionId}`);
  
  try {
    // Create voice session using session manager
    await invokeSessionManager('create', {
      connectionId,
      userId,
      data: {
        audioFormat: options.audioFormat || 'webm',
        sessionConfig: {
          streaming: options.streaming || true,
          language: options.language || 'en-US',
          model: options.model || 'claude-3-haiku',
        },
      },
    });

    // Initialize audio streaming context
    const streamingContext = audioProcessor.initializeContext(
      sessionId,
      connectionId,
      userId,
      {
        audioFormat: options.audioFormat || 'webm',
        language: options.language || 'en-US',
        model: options.model || 'claude-3-haiku',
      }
    );

    // Initialize conversation context
    await contextManager.initializeContext(
      sessionId,
      userId,
      options.language || 'en-US'
    );

    const response = {
      type: 'voice_session_initialized',
      sessionId,
      novaSonicSessionId: `ns-${sessionId}`,
      status: 'ready',
      capabilities: {
        transcription: true,
        synthesis: true,
        streaming: options.streaming || true,
        realTimeProcessing: true,
        languages: ['en-US', 'es-ES', 'fr-FR', 'de-DE'],
        models: ['claude-3-haiku', 'claude-3-sonnet'],
      },
      streamingContext: {
        audioFormat: streamingContext.audioFormat,
        language: streamingContext.language,
        model: streamingContext.model,
      },
      timestamp: new Date().toISOString(),
    };

    await sendToConnection(connectionId, response);
    
    // Publish session started event to AppSync
    await publishAppSyncEvent('voice_session_event', {
      status: 'started',
      capabilities: response.capabilities,
      streamingContext: response.streamingContext,
    }, sessionId, userId);
    
    return { statusCode: 200, body: 'Voice session initialized' };
  } catch (error) {
    console.error('Error initializing voice session:', error);
    throw error;
  }
}

async function processVoiceData(
  connectionId: string, 
  sessionId: string, 
  audioData: string,
  options: { streaming?: boolean; language?: string; model?: string } = {}
) {
  console.log(`Processing complete voice data for session: ${sessionId}`);
  
  try {
    // Process complete session using audio stream processor with conversation context
    const processingStartTime = Date.now();
    const result = await audioProcessor.processCompleteSession(
      sessionId,
      (sessionId) => contextManager.getConversationHistory(sessionId, 3)
    );
    const processingTime = Date.now() - processingStartTime;

    // Add conversation turn to context
    await contextManager.addConversationTurn(
      sessionId,
      {
        type: 'voice',
        content: result.fullTranscription,
        transcription: result.fullTranscription,
        confidence: 0.95,
      },
      {
        content: result.aiResponse,
        audioData: result.audioResponse,
        model: options.model || 'claude-3-haiku',
        processingTime,
      },
      {
        language: options.language || 'en-US',
        audioFormat: 'webm',
        triggerReason: 'complete_processing',
      }
    );
    
    // Update session message count
    await updateSessionStats(sessionId);

    const response = {
      type: 'voice_response_complete',
      sessionId,
      data: {
        transcription: result.fullTranscription,
        aiResponse: result.aiResponse,
        audioResponse: result.audioResponse,
        processingTime: Date.now(),
      },
      timestamp: new Date().toISOString(),
    };

    await sendToConnection(connectionId, response);
    
    // Publish voice response event to AppSync
    await publishAppSyncEvent('voice_response_event', {
      transcription: result.fullTranscription,
      aiResponse: result.aiResponse,
      processingComplete: true,
    }, sessionId);
    
    return { statusCode: 200, body: 'Voice data processed' };
  } catch (error) {
    console.error('Error processing voice data:', error);
    throw error;
  }
}

async function processVoiceChunk(
  connectionId: string,
  sessionId: string,
  audioData: string,
  sequenceNumber: number,
  options: { streaming?: boolean; language?: string; model?: string } = {}
) {
  console.log(`Processing voice chunk ${sequenceNumber} for session: ${sessionId}`);
  
  try {
    // Process audio chunk in real-time
    const result = await audioProcessor.processAudioChunk(sessionId, audioData, sequenceNumber);
    
    // Send real-time transcription update if available
    if (result.transcription) {
      await sendToConnection(connectionId, {
        type: 'voice_transcription_partial',
        sessionId,
        data: {
          partialTranscription: result.transcription,
          sequenceNumber,
          confidence: 0.85, // Lower confidence for partial transcription
          language: options.language || 'en-US',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Trigger complete processing if conditions are met
    if (result.shouldProcess) {
      console.log(`Triggering complete processing for session: ${sessionId}`);
      
      // Process complete session with conversation context
      const processingStartTime = Date.now();
      const completeResult = await audioProcessor.processCompleteSession(
        sessionId,
        (sessionId) => contextManager.getConversationHistory(sessionId, 3)
      );
      const processingTime = Date.now() - processingStartTime;

      // Add conversation turn to context
      await contextManager.addConversationTurn(
        sessionId,
        {
          type: 'voice',
          content: completeResult.fullTranscription,
          transcription: completeResult.fullTranscription,
          confidence: 0.85,
        },
        {
          content: completeResult.aiResponse,
          audioData: completeResult.audioResponse,
          model: options.model || 'claude-3-haiku',
          processingTime,
        },
        {
          language: options.language || 'en-US',
          audioFormat: 'webm',
          triggerReason: 'auto_processing',
        }
      );
      
      // Send complete response
      await sendToConnection(connectionId, {
        type: 'voice_response_triggered',
        sessionId,
        data: {
          transcription: completeResult.fullTranscription,
          aiResponse: completeResult.aiResponse,
          audioResponse: completeResult.audioResponse,
          triggerReason: 'auto_processing',
        },
        timestamp: new Date().toISOString(),
      });

      // Update session stats
      await updateSessionStats(sessionId);
    }
    
    return { statusCode: 200, body: 'Voice chunk processed' };
  } catch (error) {
    console.error('Error processing voice chunk:', error);
    throw error;
  }
}

async function transcribeAudio(
  connectionId: string,
  sessionId: string,
  audioData: string,
  options: { language?: string } = {}
) {
  console.log(`Transcribing audio for session: ${sessionId}`);
  
  try {
    const transcription = await transcribeAudioData(audioData, options.language);
    
    const response = {
      type: 'voice_transcription_complete',
      sessionId,
      data: {
        transcription,
        confidence: 0.95,
        language: options.language || 'en-US',
      },
      timestamp: new Date().toISOString(),
    };

    await sendToConnection(connectionId, response);
    return { statusCode: 200, body: 'Audio transcribed' };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

async function synthesizeVoice(
  connectionId: string,
  sessionId: string,
  textInput: string,
  options: { language?: string; voice?: string } = {}
) {
  console.log(`Synthesizing voice for session: ${sessionId}`);
  
  try {
    const audioResponse = await synthesizeVoiceResponse(textInput, options);
    
    const response = {
      type: 'voice_synthesis_complete',
      sessionId,
      data: {
        text: textInput,
        audioResponse,
        language: options.language || 'en-US',
        voice: options.voice || 'default',
      },
      timestamp: new Date().toISOString(),
    };

    await sendToConnection(connectionId, response);
    return { statusCode: 200, body: 'Voice synthesized' };
  } catch (error) {
    console.error('Error synthesizing voice:', error);
    throw error;
  }
}

async function endVoiceSession(connectionId: string, sessionId: string) {
  console.log(`Ending Nova Sonic session: ${sessionId}`);
  
  try {
    // Get final session state from audio processor
    const context = audioProcessor.getContext(sessionId);
    
    // Process any remaining audio if needed
    if (context && context.chunks.length > 0 && context.processingState !== 'responding') {
      console.log(`Processing final audio chunks for session: ${sessionId}`);
      
      try {
        const processingStartTime = Date.now();
        const finalResult = await audioProcessor.processCompleteSession(
          sessionId,
          (sessionId) => contextManager.getConversationHistory(sessionId, 3)
        );
        const processingTime = Date.now() - processingStartTime;

        // Add final conversation turn
        await contextManager.addConversationTurn(
          sessionId,
          {
            type: 'voice',
            content: finalResult.fullTranscription,
            transcription: finalResult.fullTranscription,
            confidence: 0.90,
          },
          {
            content: finalResult.aiResponse,
            audioData: finalResult.audioResponse,
            model: 'claude-3-haiku',
            processingTime,
          },
          {
            language: 'en-US',
            audioFormat: 'webm',
            triggerReason: 'session_end',
          }
        );
        
        // Send final response
        await sendToConnection(connectionId, {
          type: 'voice_response_final',
          sessionId,
          data: {
            transcription: finalResult.fullTranscription,
            aiResponse: finalResult.aiResponse,
            audioResponse: finalResult.audioResponse,
            processingReason: 'session_end',
          },
          timestamp: new Date().toISOString(),
        });
      } catch (processingError) {
        console.warn('Error processing final audio chunks:', processingError);
      }
    }

    // Finalize conversation context
    const finalContext = await contextManager.finalizeContext(sessionId);

    // Clean up audio processing context
    await audioProcessor.cleanupContext(sessionId);

    // End session using session manager
    await invokeSessionManager('end', { sessionId });
    
    const response = {
      type: 'voice_session_ended',
      sessionId,
      status: 'completed',
      finalStats: context ? {
        totalChunks: context.chunks.length,
        finalTranscription: context.transcriptionBuffer,
        processingState: context.processingState,
      } : undefined,
      conversationSummary: finalContext?.summary,
      timestamp: new Date().toISOString(),
    };

    await sendToConnection(connectionId, response);
    
    return { statusCode: 200, body: 'Voice session ended' };
  } catch (error) {
    console.error('Error ending voice session:', error);
    throw error;
  }
}

async function processWithBedrock(
  input: string, 
  sessionId: string,
  options: { streaming?: boolean; model?: string } = {}
): Promise<string> {
  try {
    const modelId = options.model === 'claude-3-sonnet' 
      ? 'anthropic.claude-3-sonnet-20240229-v1:0'
      : 'anthropic.claude-3-haiku-20240307-v1:0';

    // Get conversation history for context
    const conversationHistory = await contextManager.getConversationHistory(sessionId, 3);

    const prompt = `You are an AI assistant integrated with a voice interface. 
    ${conversationHistory}
    
    The user said: "${input}". 
    Provide a helpful, conversational response that would work well when spoken aloud. Keep it concise but informative.`;
    
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    };

    if (options.streaming) {
      // Use streaming for real-time responses
      const command = new InvokeModelWithResponseStreamCommand({
        modelId,
        body: JSON.stringify(requestBody),
        contentType: 'application/json',
        accept: 'application/json',
      });

      const response = await bedrockClient.send(command);
      
      // In a real implementation, you would stream the response back to the client
      // For now, we'll collect the full response
      let fullResponse = '';
      if (response.body) {
        for await (const chunk of response.body) {
          if (chunk.chunk?.bytes) {
            const chunkData = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
            if (chunkData.type === 'content_block_delta' && chunkData.delta?.text) {
              fullResponse += chunkData.delta.text;
            }
          }
        }
      }
      
      return fullResponse || 'I apologize, but I encountered an issue processing your request.';
    } else {
      // Use regular invoke for non-streaming
      const command = new InvokeModelCommand({
        modelId,
        body: JSON.stringify(requestBody),
        contentType: 'application/json',
        accept: 'application/json',
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return responseBody.content[0].text;
    }
  } catch (error) {
    console.error('Error calling Bedrock:', error);
    return 'I apologize, but I encountered an error processing your request.';
  }
}

async function transcribeAudioData(audioData: string, language: string = 'en-US'): Promise<string> {
  // In a real Nova Sonic implementation, this would use AWS Transcribe or Nova Sonic's transcription
  // For now, we'll simulate transcription
  console.log(`Transcribing audio data (${audioData.length} chars) in language: ${language}`);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock transcription based on audio data length
  const mockTranscriptions = [
    "Hello, how can I help you today?",
    "I'd like to know more about this project.",
    "Can you explain how this system works?",
    "What are the main features available?",
    "Thank you for the information.",
  ];
  
  const index = Math.abs(audioData.length) % mockTranscriptions.length;
  return mockTranscriptions[index];
}

async function synthesizeVoiceResponse(text: string, options: { language?: string; voice?: string } = {}): Promise<string> {
  // In a real Nova Sonic implementation, this would use AWS Polly or Nova Sonic's synthesis
  // For now, we'll simulate voice synthesis
  console.log(`Synthesizing voice for text: "${text.substring(0, 50)}..." in language: ${options.language || 'en-US'}`);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock base64 audio data
  return `data:audio/mp3;base64,${Buffer.from(`mock-audio-${text.length}-${Date.now()}`).toString('base64')}`;
}

async function storeAudioData(sessionId: string, audioData: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const audioKey = `voice-sessions/${sessionId}/audio-${timestamp}.webm`;
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    await s3Client.send(new PutObjectCommand({
      Bucket: AUDIO_STORAGE_BUCKET,
      Key: audioKey,
      Body: audioBuffer,
      ContentType: 'audio/webm',
      Metadata: {
        sessionId,
        timestamp: timestamp.toString(),
      },
    }));

    console.log(`Stored audio data: ${audioKey}`);
    return audioKey;
  } catch (error) {
    console.error('Error storing audio data:', error);
    throw error;
  }
}

async function updateSessionStats(sessionId: string): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: VOICE_SESSIONS_TABLE_NAME,
      Key: { PK: `VOICE#${sessionId}`, SK: 'METADATA' },
      UpdateExpression: 'ADD messageCount :inc SET updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':updatedAt': new Date().toISOString(),
      },
    }));
  } catch (error) {
    console.error('Error updating session stats:', error);
    // Don't throw error to avoid breaking the main function
  }
}

async function invokeSessionManager(action: string, data: any): Promise<any> {
  try {
    const sessionManagerArn = process.env.SESSION_MANAGER_FUNCTION_ARN;
    if (!sessionManagerArn) {
      console.warn('SESSION_MANAGER_FUNCTION_ARN not set, skipping session manager call');
      return;
    }

    const command = new InvokeCommand({
      FunctionName: sessionManagerArn,
      Payload: JSON.stringify({ action, ...data }),
    });

    const response = await lambdaClient.send(command);
    
    if (response.Payload) {
      return JSON.parse(new TextDecoder().decode(response.Payload));
    }
  } catch (error) {
    console.error('Error invoking session manager:', error);
    // Don't throw error to avoid breaking the main function
  }
}

async function publishAppSyncEvent(eventType: string, payload: any, sessionId?: string, userId?: string): Promise<void> {
  try {
    // This would invoke the AppSync Events publisher if available
    console.log(`Publishing AppSync event: ${eventType}`, { sessionId, userId, payload });
    
    // TODO: Invoke AppSync Events publisher Lambda function when available
    // const eventPublisherArn = process.env.EVENT_PUBLISHER_FUNCTION_ARN;
    // if (eventPublisherArn) {
    //   await lambdaClient.send(new InvokeCommand({
    //     FunctionName: eventPublisherArn,
    //     Payload: JSON.stringify({
    //       eventType,
    //       payload,
    //       sessionId,
    //       userId,
    //       timestamp: new Date().toISOString(),
    //     }),
    //   }));
    // }
  } catch (error) {
    console.error('Error publishing AppSync event:', error);
    // Don't throw error to avoid breaking the main function
  }
}

async function sendToConnection(connectionId: string, data: any) {
  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data),
    });

    await apiGatewayClient.send(command);
    console.log(`Message sent to connection: ${connectionId}`);
  } catch (error) {
    console.error(`Error sending message to connection ${connectionId}:`, error);
    throw error;
  }
}