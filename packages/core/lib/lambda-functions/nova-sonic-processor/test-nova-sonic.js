// Simple test to verify Nova Sonic processor implementation
const { AudioStreamProcessor } = require('./audio-streaming');

async function testNovaSonicProcessor() {
  console.log('Testing Nova Sonic Processor Implementation...');
  
  try {
    // Initialize audio processor
    const processor = new AudioStreamProcessor('test-bucket');
    
    // Test 1: Initialize context
    console.log('\n1. Testing context initialization...');
    const context = processor.initializeContext(
      'test-session-123',
      'conn-123',
      'user-123',
      {
        audioFormat: 'webm',
        language: 'en-US',
        model: 'claude-3-haiku'
      }
    );
    
    console.log('✓ Context initialized:', {
      sessionId: context.sessionId,
      audioFormat: context.audioFormat,
      language: context.language,
      model: context.model,
      processingState: context.processingState
    });
    
    // Test 2: Process audio chunks
    console.log('\n2. Testing audio chunk processing...');
    const mockAudioData = Buffer.from('mock-audio-data-chunk-1').toString('base64');
    
    const chunkResult = await processor.processAudioChunk(
      'test-session-123',
      mockAudioData,
      1
    );
    
    console.log('✓ Audio chunk processed:', {
      hasTranscription: !!chunkResult.transcription,
      transcription: chunkResult.transcription,
      shouldProcess: chunkResult.shouldProcess
    });
    
    // Test 3: Add more chunks to trigger processing
    console.log('\n3. Testing multiple chunks...');
    for (let i = 2; i <= 5; i++) {
      const chunkData = Buffer.from(`mock-audio-data-chunk-${i}`).toString('base64');
      await processor.processAudioChunk('test-session-123', chunkData, i);
    }
    
    // Test 4: Get context state
    console.log('\n4. Testing context state...');
    const currentContext = processor.getContext('test-session-123');
    console.log('✓ Current context:', {
      chunkCount: currentContext.chunks.length,
      transcriptionBuffer: currentContext.transcriptionBuffer,
      processingState: currentContext.processingState
    });
    
    // Test 5: Process complete session
    console.log('\n5. Testing complete session processing...');
    const completeResult = await processor.processCompleteSession('test-session-123');
    
    console.log('✓ Complete session processed:', {
      hasTranscription: !!completeResult.fullTranscription,
      transcriptionLength: completeResult.fullTranscription.length,
      hasAIResponse: !!completeResult.aiResponse,
      aiResponseLength: completeResult.aiResponse.length,
      hasAudioResponse: !!completeResult.audioResponse
    });
    
    // Test 6: Cleanup
    console.log('\n6. Testing cleanup...');
    processor.cleanupContext('test-session-123');
    const cleanedContext = processor.getContext('test-session-123');
    console.log('✓ Context cleaned up:', { contextExists: !!cleanedContext });
    
    console.log('\n✅ All Nova Sonic Processor tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testNovaSonicProcessor();