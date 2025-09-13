import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { NovaSonicService } from './nova-sonic-service';

const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({});

export interface AudioChunk {
  data: string; // base64 encoded audio data
  format: string;
  timestamp: number;
  sequenceNumber: number;
}

export interface StreamingContext {
  sessionId: string;
  connectionId: string;
  userId: string;
  audioFormat: string;
  language: string;
  model: string;
  chunks: AudioChunk[];
  transcriptionBuffer: string;
  processingState: 'idle' | 'receiving' | 'processing' | 'responding';
}

export class AudioStreamProcessor {
  private contexts: Map<string, StreamingContext> = new Map();
  private readonly bucketName: string;
  private readonly novaSonicService: NovaSonicService;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
    this.novaSonicService = new NovaSonicService();
  }

  /**
   * Initialize a new streaming context for a voice session
   */
  initializeContext(
    sessionId: string,
    connectionId: string,
    userId: string,
    config: { audioFormat: string; language: string; model: string }
  ): StreamingContext {
    const context: StreamingContext = {
      sessionId,
      connectionId,
      userId,
      audioFormat: config.audioFormat,
      language: config.language,
      model: config.model,
      chunks: [],
      transcriptionBuffer: '',
      processingState: 'idle',
    };

    this.contexts.set(sessionId, context);
    
    // Initialize Nova Sonic bidirectional stream
    try {
      await this.novaSonicService.initializeStream(sessionId, config.language);
      console.log(`Initialized streaming context and Nova Sonic stream for session: ${sessionId}`);
    } catch (error) {
      console.warn(`Failed to initialize Nova Sonic stream for session ${sessionId}, using fallback:`, error);
    }
    
    return context;
  }

  /**
   * Process incoming audio chunk in real-time
   */
  async processAudioChunk(
    sessionId: string,
    audioData: string,
    sequenceNumber: number
  ): Promise<{ transcription?: string; shouldProcess?: boolean }> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`No streaming context found for session: ${sessionId}`);
    }

    // Add chunk to buffer
    const chunk: AudioChunk = {
      data: audioData,
      format: context.audioFormat,
      timestamp: Date.now(),
      sequenceNumber,
    };

    context.chunks.push(chunk);
    context.processingState = 'receiving';

    // Process audio chunk with Nova Sonic real-time streaming
    let partialTranscription: string | undefined;
    let shouldProcess = false;

    try {
      const novaSonicResult = await this.novaSonicService.processAudioChunk(
        sessionId,
        audioData,
        sequenceNumber
      );
      
      partialTranscription = novaSonicResult.partialTranscription;
      shouldProcess = novaSonicResult.shouldProcess || false;
    } catch (error) {
      console.warn(`Nova Sonic chunk processing failed for session ${sessionId}, using fallback:`, error);
      
      // Fallback to simulated transcription
      partialTranscription = await this.transcribeAudioChunk(chunk, context);
      shouldProcess = this.shouldTriggerProcessing(context);
    }
    
    if (partialTranscription) {
      context.transcriptionBuffer += partialTranscription;
    }

    return {
      transcription: partialTranscription,
      shouldProcess,
    };
  }

  /**
   * Process complete audio session with AI response
   */
  async processCompleteSession(
    sessionId: string,
    getConversationHistory?: (sessionId: string) => Promise<string>
  ): Promise<{
    fullTranscription: string;
    aiResponse: string;
    audioResponse: string;
  }> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`No streaming context found for session: ${sessionId}`);
    }

    context.processingState = 'processing';

    try {
      // Combine all audio chunks
      const combinedAudio = await this.combineAudioChunks(context.chunks);
      
      // Store combined audio in S3
      await this.storeAudioSession(sessionId, combinedAudio);
      
      // Get conversation history if callback provided
      const conversationHistory = getConversationHistory 
        ? await getConversationHistory(sessionId)
        : undefined;

      // Process with Nova Sonic Speech-to-Speech
      let fullTranscription: string;
      let aiResponse: string;
      let audioResponse: string;

      try {
        const novaSonicResponse = await this.novaSonicService.processSpeechToSpeech({
          sessionId,
          audioData: combinedAudio.toString('base64'),
          language: context.language,
          conversationHistory,
        });

        fullTranscription = novaSonicResponse.transcription || context.transcriptionBuffer;
        aiResponse = novaSonicResponse.aiResponse || 'I apologize, but I could not generate a response.';
        audioResponse = novaSonicResponse.audioResponse || '';
      } catch (error) {
        console.warn(`Nova Sonic processing failed for session ${sessionId}, using fallback:`, error);
        
        // Fallback to traditional processing
        fullTranscription = context.transcriptionBuffer || 
          await this.transcribeCompleteAudio(combinedAudio, context.language);
        aiResponse = await this.generateAIResponse(fullTranscription, context, conversationHistory);
        audioResponse = await this.synthesizeVoiceResponse(aiResponse, context);
      }

      context.processingState = 'responding';

      return {
        fullTranscription,
        aiResponse,
        audioResponse,
      };
    } catch (error) {
      context.processingState = 'idle';
      throw error;
    }
  }

  /**
   * Clean up streaming context
   */
  async cleanupContext(sessionId: string): Promise<void> {
    // End Nova Sonic stream
    try {
      await this.novaSonicService.endStream(sessionId);
    } catch (error) {
      console.warn(`Error ending Nova Sonic stream for session ${sessionId}:`, error);
    }

    // Clean up local context
    this.contexts.delete(sessionId);
    console.log(`Cleaned up streaming context and Nova Sonic stream for session: ${sessionId}`);
  }

  /**
   * Get current context state
   */
  getContext(sessionId: string): StreamingContext | undefined {
    return this.contexts.get(sessionId);
  }

  private async transcribeAudioChunk(
    chunk: AudioChunk,
    context: StreamingContext
  ): Promise<string> {
    // In a real Nova Sonic implementation, this would use AWS Transcribe Streaming
    // or Nova Sonic's real-time transcription capabilities
    
    // Simulate real-time transcription based on chunk data
    const chunkSize = chunk.data.length;
    const mockWords = [
      'Hello', 'how', 'are', 'you', 'today', 'I', 'need', 'help', 'with',
      'this', 'project', 'can', 'you', 'explain', 'the', 'process', 'please',
    ];
    
    // Simulate word detection based on chunk characteristics
    if (chunkSize > 1000) { // Larger chunks likely contain speech
      const wordIndex = (chunk.sequenceNumber + chunkSize) % mockWords.length;
      return mockWords[wordIndex] + ' ';
    }
    
    return '';
  }

  private shouldTriggerProcessing(context: StreamingContext): boolean {
    // Trigger processing based on various conditions:
    
    // 1. Silence detection (simulated by chunk gaps)
    const lastChunk = context.chunks[context.chunks.length - 1];
    const secondLastChunk = context.chunks[context.chunks.length - 2];
    
    if (lastChunk && secondLastChunk) {
      const timeDiff = lastChunk.timestamp - secondLastChunk.timestamp;
      if (timeDiff > 2000) { // 2 second gap suggests end of speech
        return true;
      }
    }

    // 2. Buffer length threshold
    if (context.transcriptionBuffer.length > 100) {
      return true;
    }

    // 3. Chunk count threshold
    if (context.chunks.length > 50) {
      return true;
    }

    return false;
  }

  private async combineAudioChunks(chunks: AudioChunk[]): Promise<Buffer> {
    // In a real implementation, this would properly combine audio chunks
    // For now, we'll simulate by combining the base64 data
    
    const combinedData = chunks
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map(chunk => chunk.data)
      .join('');

    return Buffer.from(combinedData, 'base64');
  }

  private async storeAudioSession(sessionId: string, audioData: Buffer): Promise<string> {
    const timestamp = Date.now();
    const audioKey = `voice-sessions/${sessionId}/complete-audio-${timestamp}.webm`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: audioKey,
      Body: audioData,
      ContentType: 'audio/webm',
      Metadata: {
        sessionId,
        timestamp: timestamp.toString(),
        type: 'complete-session',
      },
    }));

    console.log(`Stored complete audio session: ${audioKey}`);
    return audioKey;
  }

  private async transcribeCompleteAudio(
    audioData: Buffer,
    language: string
  ): Promise<string> {
    // In a real Nova Sonic implementation, this would use AWS Transcribe
    // or Nova Sonic's transcription service
    
    console.log(`Transcribing complete audio (${audioData.length} bytes) in language: ${language}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock transcription based on audio data characteristics
    const mockTranscriptions = [
      "Hello, I need help with understanding how this AI system works and what capabilities it has.",
      "Can you explain the main features of this application and how I can use them effectively?",
      "I'm interested in learning more about the voice interface and how it processes my speech.",
      "What are the different types of applications I can access through this platform?",
      "How does the real-time communication system work with the AI processing?",
    ];
    
    const index = Math.abs(audioData.length) % mockTranscriptions.length;
    return mockTranscriptions[index];
  }

  private async generateAIResponse(
    transcription: string,
    context: StreamingContext,
    conversationHistory?: string
  ): Promise<string> {
    try {
      const modelId = context.model === 'claude-3-sonnet' 
        ? 'anthropic.claude-3-sonnet-20240229-v1:0'
        : 'anthropic.claude-3-haiku-20240307-v1:0';

      const prompt = `You are an AI assistant with voice interface capabilities. 
      ${conversationHistory || ''}
      
      The user said: "${transcription}"
      
      Provide a helpful, conversational response that would work well when spoken aloud. 
      Keep it concise but informative, and maintain a natural speaking tone.
      
      Context: This is a voice conversation in a groupware application with AI capabilities.`;
      
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

      // Use streaming for real-time responses
      const command = new InvokeModelWithResponseStreamCommand({
        modelId,
        body: JSON.stringify(requestBody),
        contentType: 'application/json',
        accept: 'application/json',
      });

      const response = await bedrockClient.send(command);
      
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
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  private async synthesizeVoiceResponse(
    text: string,
    context: StreamingContext
  ): Promise<string> {
    // In a real Nova Sonic implementation, this would use AWS Polly
    // or Nova Sonic's voice synthesis capabilities
    
    console.log(`Synthesizing voice response for text: "${text.substring(0, 50)}..." in language: ${context.language}`);
    
    // Simulate processing time based on text length
    const processingTime = Math.min(text.length * 10, 3000); // Max 3 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Return mock base64 audio data
    const mockAudioData = Buffer.from(`mock-voice-${text.length}-${Date.now()}`).toString('base64');
    return `data:audio/mp3;base64,${mockAudioData}`;
  }
}