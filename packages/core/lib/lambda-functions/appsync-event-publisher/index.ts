import { Handler } from 'aws-lambda';
import { AppSyncClient } from '@aws-sdk/client-appsync';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL!;
const AWS_REGION = process.env.AWS_REGION!;

// Create a signature v4 instance for IAM authentication
const signer = new SignatureV4({
  credentials: defaultProvider(),
  region: AWS_REGION,
  service: 'appsync',
  sha256: Sha256,
});

export const handler: Handler = async (event) => {
  console.log('AppSync event publisher event:', JSON.stringify(event, null, 2));

  try {
    const { eventType, payload, userId, sessionId } = event;

    switch (eventType) {
      case 'voice_session_event':
        return await publishVoiceSessionEvent(sessionId, payload);
      case 'chat_event':
        return await publishChatEvent(userId, payload);
      case 'ui_control_event':
        return await publishUIControlEvent(userId, payload);
      case 'notes_event':
        return await publishNotesEvent(userId, payload);
      case 'general_event':
        return await publishGeneralEvent(eventType, payload, userId);
      default:
        console.log(`Unknown event type: ${eventType}`);
        return { statusCode: 400, body: 'Unknown event type' };
    }
  } catch (error) {
    console.error('Error publishing event:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

async function publishVoiceSessionEvent(sessionId: string, payload: any) {
  console.log(`Publishing voice session event for session: ${sessionId}`);
  
  const mutation = `
    mutation PublishVoiceSessionEvent($sessionId: String!, $status: String!, $data: AWSJSON) {
      publishVoiceSessionEvent(sessionId: $sessionId, status: $status, data: $data) {
        sessionId
        status
        data
        timestamp
      }
    }
  `;

  const variables = {
    sessionId,
    status: payload.status,
    data: JSON.stringify(payload.data || {}),
  };

  try {
    const result = await executeGraphQLRequest(mutation, variables);
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error('Failed to publish voice session event');
    }

    console.log('Voice session event published successfully:', result.data);
    return { statusCode: 200, body: 'Voice session event published' };
  } catch (error) {
    console.error('Error publishing voice session event:', error);
    throw error;
  }
}

async function publishChatEvent(userId: string, payload: any) {
  console.log(`Publishing chat event for user: ${userId}`);
  
  const mutation = `
    mutation PublishChatEvent($userId: String!, $message: AWSJSON!) {
      publishChatEvent(userId: $userId, message: $message) {
        userId
        message
        timestamp
      }
    }
  `;

  const variables = {
    userId,
    message: JSON.stringify(payload.message),
  };

  try {
    const result = await executeGraphQLRequest(mutation, variables);
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error('Failed to publish chat event');
    }

    console.log('Chat event published successfully:', result.data);
    return { statusCode: 200, body: 'Chat event published' };
  } catch (error) {
    console.error('Error publishing chat event:', error);
    throw error;
  }
}

async function publishGeneralEvent(eventType: string, payload: any, userId: string) {
  console.log(`Publishing general event: ${eventType} for user: ${userId}`);
  
  const mutation = `
    mutation PublishEvent($type: String!, $payload: AWSJSON!, $userId: String!) {
      publishEvent(type: $type, payload: $payload, userId: $userId) {
        id
        type
        payload
        userId
        timestamp
      }
    }
  `;

  const variables = {
    type: eventType,
    payload: JSON.stringify(payload),
    userId,
  };

  try {
    const result = await executeGraphQLRequest(mutation, variables);
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error('Failed to publish general event');
    }

    console.log('General event published successfully:', result.data);
    return { statusCode: 200, body: 'General event published' };
  } catch (error) {
    console.error('Error publishing general event:', error);
    throw error;
  }
}
async 
function publishUIControlEvent(userId: string, payload: any) {
  console.log(`Publishing UI control event for user: ${userId}`);
  
  const mutation = `
    mutation PublishUIControlEvent($userId: String!, $action: String!, $target: String!, $content: AWSJSON) {
      publishUIControlEvent(userId: $userId, action: $action, target: $target, content: $content) {
        userId
        action
        target
        content
        timestamp
      }
    }
  `;

  const variables = {
    userId,
    action: payload.action,
    target: payload.target,
    content: JSON.stringify(payload.content || {}),
  };

  try {
    const result = await executeGraphQLRequest(mutation, variables);
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error('Failed to publish UI control event');
    }

    console.log('UI control event published successfully:', result.data);
    return { statusCode: 200, body: 'UI control event published' };
  } catch (error) {
    console.error('Error publishing UI control event:', error);
    throw error;
  }
}

async function publishNotesEvent(userId: string, payload: any) {
  console.log(`Publishing notes event for user: ${userId}`);
  
  const mutation = `
    mutation PublishNotesEvent($userId: String!, $noteId: String!, $action: String!, $content: AWSJSON) {
      publishNotesEvent(userId: $userId, noteId: $noteId, action: $action, content: $content) {
        userId
        noteId
        action
        content
        timestamp
      }
    }
  `;

  const variables = {
    userId,
    noteId: payload.noteId,
    action: payload.action,
    content: JSON.stringify(payload.content || {}),
  };

  try {
    const result = await executeGraphQLRequest(mutation, variables);
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error('Failed to publish notes event');
    }

    console.log('Notes event published successfully:', result.data);
    return { statusCode: 200, body: 'Notes event published' };
  } catch (error) {
    console.error('Error publishing notes event:', error);
    throw error;
  }
}

// Helper function to execute GraphQL requests with IAM authentication
async function executeGraphQLRequest(query: string, variables: any): Promise<any> {
  const requestBody = JSON.stringify({ query, variables });
  
  const request = {
    method: 'POST',
    protocol: 'https:',
    hostname: new URL(GRAPHQL_API_URL).hostname,
    path: new URL(GRAPHQL_API_URL).pathname,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody).toString(),
    },
    body: requestBody,
  };

  // Sign the request with IAM credentials
  const signedRequest = await signer.sign(request);

  // Execute the signed request
  const response = await fetch(GRAPHQL_API_URL, {
    method: signedRequest.method,
    headers: signedRequest.headers,
    body: signedRequest.body,
  });

  return await response.json();
}