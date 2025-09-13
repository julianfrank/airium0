export const USER_PROFILES = {
  ADMIN: 'ADMIN',
  GENERAL: 'GENERAL'
} as const;

export const APPLICATION_TYPES = {
  REST: 'REST',
  MCP: 'MCP',
  INBUILT: 'INBUILT'
} as const;

export const MESSAGE_TYPES = {
  TEXT: 'TEXT',
  VOICE: 'VOICE',
  MEDIA: 'MEDIA'
} as const;

export const CONNECTION_STATUS = {
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED'
} as const;

export const VOICE_SESSION_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED'
} as const;

export const WEBSOCKET_ACTIONS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  START_VOICE: 'start_voice',
  END_VOICE: 'end_voice',
  AUDIO_DATA: 'audio_data'
} as const;