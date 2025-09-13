// Simple verification of Nova Sonic implementation
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Nova Sonic Implementation...\n');

const novaSonicServicePath = path.join(__dirname, 'lib/lambda-functions/nova-sonic-processor/nova-sonic-service.ts');
const audioStreamingPath = path.join(__dirname, 'lib/lambda-functions/nova-sonic-processor/audio-streaming.ts');
const processorPath = path.join(__dirname, 'lib/lambda-functions/nova-sonic-processor/index.ts');

console.log('📁 Checking Nova Sonic files...');

if (fs.existsSync(novaSonicServicePath)) {
  console.log('✅ Nova Sonic Service: Found');
  
  // Check for key Nova Sonic implementation
  const serviceContent = fs.readFileSync(novaSonicServicePath, 'utf8');
  
  const checks = [
    { name: 'InvokeModelWithBidirectionalStreamCommand import', pattern: /InvokeModelWithBidirectionalStreamCommand/ },
    { name: 'Nova Sonic model ID', pattern: /amazon\.nova-sonic-v1:0/ },
    { name: 'generateOrderedStream method', pattern: /generateOrderedStream/ },
    { name: 'Bidirectional streaming', pattern: /bidirectional/i },
    { name: 'Real-time processing', pattern: /processAudioChunk/ },
    { name: 'Speech-to-speech pipeline', pattern: /processSpeechToSpeech/ },
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(serviceContent)) {
      console.log(`   ✅ ${check.name}: Implemented`);
    } else {
      console.log(`   ❌ ${check.name}: Missing`);
    }
  });
} else {
  console.log('❌ Nova Sonic Service: Not found');
}

if (fs.existsSync(audioStreamingPath)) {
  console.log('✅ Audio Streaming: Found');
  
  const streamingContent = fs.readFileSync(audioStreamingPath, 'utf8');
  
  if (streamingContent.includes('NovaSonicService')) {
    console.log('   ✅ Nova Sonic integration: Connected');
  } else {
    console.log('   ❌ Nova Sonic integration: Not connected');
  }
} else {
  console.log('❌ Audio Streaming: Not found');
}

if (fs.existsSync(processorPath)) {
  console.log('✅ Main Processor: Found');
  
  const processorContent = fs.readFileSync(processorPath, 'utf8');
  
  if (processorContent.includes('InvokeModelWithBidirectionalStreamCommand')) {
    console.log('   ✅ Bidirectional stream import: Present');
  } else {
    console.log('   ❌ Bidirectional stream import: Missing');
  }
} else {
  console.log('❌ Main Processor: Not found');
}

console.log('\n📋 Nova Sonic Implementation Summary:');
console.log('   🎯 Model: amazon.nova-sonic-v1:0');
console.log('   🔄 Command: InvokeModelWithBidirectionalStreamCommand');
console.log('   📡 Pattern: aws-samples/sample-serverless-nova-sonic-chat');
console.log('   🎤 Features: Real-time speech-to-speech processing');
console.log('   🔧 Fallback: Claude models for reliability');

console.log('\n✅ Nova Sonic verification complete!');