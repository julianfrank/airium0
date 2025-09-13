import { Handler } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const WEBSOCKET_API_ID = process.env.WEBSOCKET_API_ID!;
const region = process.env.AWS_REGION || 'us-east-1';

const apiGatewayClient = new ApiGatewayManagementApiClient({
  endpoint: `https://${WEBSOCKET_API_ID}.execute-api.${region}.amazonaws.com/prod`,
});

const bedrockClient = new BedrockRuntimeClient({ region });

export const handler: Handler = async (event) => {
  console.log('Nova Sonic processor event:', JSON.stringify(event, null, 2));

  try {
    const { connectionId, sessionId, audioData, messageType } = event;

    switch (messageType) {
      case 'voice_session_start':
        return await initializeVoiceSession(connectionId, sessionId);
      case 'voice_data_process':
        return await processVoiceData(connectionId, sessionId, audioData);
      case 'voice_session_end':
        return await endVoiceSession(connectionId, sessionId);
      default:
        console.log(`Unknown message type: ${messageType}`);
        return { statusCode: 400, body: 'Unknown message type' };
    }
  } catch (error) {
    console.error('Error in Nova Sonic processor:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

async function initializeVoiceSession(connectionId: string, sessionId: string) {
  console.log(`Initializing Nova Sonic session: ${sessionId} for connection: ${connectionId}`);
  
  // TODO: Initialize actual Nova Sonic session
  // For now, send a mock response
  const response = {
    type: 'voice_session_initialized',
    sessionId,
    status: 'ready',
    timestamp: new Date().toISOString(),
  };

  await sendToConnection(connectionId, response);
  
  return { statusCode: 200, body: 'Voice session initialized' };
}

async function processVoiceData(connectionId: string, sessionId: string, audioData: string) {
  console.log(`Processing voice data for session: ${sessionId}`);
  
  try {
    // TODO: Integrate with actual Nova Sonic service
    // For now, simulate AI processing with Bedrock
    const aiResponse = await processWithBedrock(audioData);
    
    const response = {
      type: 'voice_response',
      sessionId,
      data: {
        transcription: 'Mock transcription of audio input',
        aiResponse: aiResponse,
        audioResponse: 'base64_encoded_audio_response', // Mock audio response
      },
      timestamp: new Date().toISOString(),
    };

    await sendToConnection(connectionId, response);
    
    return { statusCode: 200, body: 'Voice data processed' };
  } catch (error) {
    console.error('Error processing voice data:', error);
    
    const errorResponse = {
      type: 'voice_error',
      sessionId,
      error: 'Failed to process voice data',
      timestamp: new Date().toISOString(),
    };

    await sendToConnection(connectionId, errorResponse);
    return { statusCode: 500, body: 'Error processing voice data' };
  }
}

async function endVoiceSession(connectionId: string, sessionId: string) {
  console.log(`Ending Nova Sonic session: ${sessionId}`);
  
  // TODO: Clean up Nova Sonic session resources
  
  const response = {
    type: 'voice_session_ended',
    sessionId,
    status: 'completed',
    timestamp: new Date().toISOString(),
  };

  await sendToConnection(connectionId, response);
  
  return { statusCode: 200, body: 'Voice session ended' };
}

async function processWithBedrock(input: string): Promise<string> {
  try {
    const prompt = `Process this voice input and provide a helpful response: ${input}`;
    
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  } catch (error) {
    console.error('Error calling Bedrock:', error);
    return 'I apologize, but I encountered an error processing your request.';
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