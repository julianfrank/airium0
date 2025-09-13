import type { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export interface Connection {
  PK: string;          // CONNECTION#${connectionId}
  SK: string;          // METADATA
  connectionId: string;
  userId: string;
  sessionId: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  createdAt: string;
  lastActivity: string;
}

export interface WebSocketMessage {
  action: string;
  data?: any;
  sessionId?: string;
  userId?: string;
}

export interface WebSocketHandler {
  onConnect(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2>;
  onDisconnect(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2>;
  onMessage(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2>;
}

export interface WebSocketResponse {
  statusCode: number;
  body?: string;
}