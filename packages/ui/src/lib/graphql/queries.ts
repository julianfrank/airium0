import { gql } from 'graphql-tag';

/**
 * GraphQL Mutations for AppSync Events
 */

export const PUBLISH_EVENT = gql`
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

export const PUBLISH_VOICE_SESSION_EVENT = gql`
  mutation PublishVoiceSessionEvent($sessionId: String!, $status: String!, $data: AWSJSON) {
    publishVoiceSessionEvent(sessionId: $sessionId, status: $status, data: $data) {
      sessionId
      status
      data
      timestamp
    }
  }
`;

export const PUBLISH_CHAT_EVENT = gql`
  mutation PublishChatEvent($userId: String!, $message: AWSJSON!) {
    publishChatEvent(userId: $userId, message: $message) {
      userId
      message
      timestamp
    }
  }
`;

export const PUBLISH_UI_CONTROL_EVENT = gql`
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

export const PUBLISH_NOTES_EVENT = gql`
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

/**
 * GraphQL Subscriptions for Real-time Events
 */

export const ON_EVENT = gql`
  subscription OnEvent($userId: String!) {
    onEvent(userId: $userId) {
      id
      type
      payload
      userId
      timestamp
    }
  }
`;

export const ON_VOICE_SESSION_EVENT = gql`
  subscription OnVoiceSessionEvent($sessionId: String!) {
    onVoiceSessionEvent(sessionId: $sessionId) {
      sessionId
      status
      data
      timestamp
    }
  }
`;

export const ON_CHAT_EVENT = gql`
  subscription OnChatEvent($userId: String!) {
    onChatEvent(userId: $userId) {
      userId
      message
      timestamp
    }
  }
`;

export const ON_UI_CONTROL_EVENT = gql`
  subscription OnUIControlEvent($userId: String!) {
    onUIControlEvent(userId: $userId) {
      userId
      action
      target
      content
      timestamp
    }
  }
`;

export const ON_NOTES_EVENT = gql`
  subscription OnNotesEvent($userId: String!) {
    onNotesEvent(userId: $userId) {
      userId
      noteId
      action
      content
      timestamp
    }
  }
`;