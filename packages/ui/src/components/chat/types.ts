import type { ChatMessage as SharedChatMessage, ChatEvent } from '@airium/shared/types';

export interface Message extends SharedChatMessage {
  isUser: boolean;
  isLoading?: boolean;
  error?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  sessionId: string | null;
}

export interface ChatInterfaceProps {
  userId: string;
  className?: string;
  onMessage?: (message: Message) => void;
  onError?: (error: string) => void;
  maxMessages?: number;
}

export interface ChatMessageProps {
  message: Message;
  className?: string;
}

export interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export interface ChatHistoryProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

export interface AIResponseHandlerProps {
  userId: string;
  onResponse: (message: Message) => void;
  onError: (error: string) => void;
}

export interface ChatService {
  sendMessage: (content: string, userId: string) => Promise<void>;
  getHistory: (userId: string, limit?: number) => Promise<Message[]>;
  clearHistory: (userId: string) => Promise<void>;
}