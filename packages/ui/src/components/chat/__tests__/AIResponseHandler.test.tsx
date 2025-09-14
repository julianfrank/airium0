import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AIResponseHandler } from '../AIResponseHandler';
import type { ChatEvent } from '@airium/shared/types';

// Mock the subscription hook
const mockUseChatSubscription = vi.fn();
vi.mock('../../lib/use-appsync-subscriptions', () => ({
  useChatSubscription: mockUseChatSubscription
}));

describe('AIResponseHandler', () => {
  const mockOnResponse = vi.fn();
  const mockOnError = vi.fn();
  const userId = 'test-user-123';

  beforeEach(() => {
    mockOnResponse.mockClear();
    mockOnError.mockClear();
    mockUseChatSubscription.mockClear();
  });

  it('renders without crashing', () => {
    mockUseChatSubscription.mockReturnValue({
      data: null,
      error: null
    });

    render(
      <AIResponseHandler
        userId={userId}
        onResponse={mockOnResponse}
        onError={mockOnError}
      />
    );

    // Component should render without visible content
    expect(document.body).toBeInTheDocument();
  });

  it('calls onResponse when AI response event is received', () => {
    const mockChatEvent: ChatEvent = {
      eventType: 'chat_event',
      userId,
      timestamp: '2024-01-01T12:00:00Z',
      payload: {
        message: {
          id: 'ai-msg-1',
          type: 'TEXT',
          content: 'Hello! How can I help you?',
          timestamp: '2024-01-01T12:00:00Z'
        },
        type: 'ai_response'
      }
    };

    mockUseChatSubscription.mockReturnValue({
      data: mockChatEvent,
      error: null
    });

    render(
      <AIResponseHandler
        userId={userId}
        onResponse={mockOnResponse}
        onError={mockOnError}
      />
    );

    expect(mockOnResponse).toHaveBeenCalledWith({
      id: 'ai-msg-1',
      type: 'TEXT',
      content: 'Hello! How can I help you?',
      timestamp: '2024-01-01T12:00:00Z',
      isUser: false,
      isLoading: false
    });
  });

  it('calls onResponse when system message event is received', () => {
    const mockChatEvent: ChatEvent = {
      eventType: 'chat_event',
      userId,
      timestamp: '2024-01-01T12:00:00Z',
      payload: {
        message: {
          id: 'system-msg-1',
          type: 'TEXT',
          content: 'System notification',
          timestamp: '2024-01-01T12:00:00Z'
        },
        type: 'system_message'
      }
    };

    mockUseChatSubscription.mockReturnValue({
      data: mockChatEvent,
      error: null
    });

    render(
      <AIResponseHandler
        userId={userId}
        onResponse={mockOnResponse}
        onError={mockOnError}
      />
    );

    expect(mockOnResponse).toHaveBeenCalledWith({
      id: 'system-msg-1',
      type: 'TEXT',
      content: 'System notification',
      timestamp: '2024-01-01T12:00:00Z',
      isUser: false,
      isLoading: false
    });
  });

  it('does not call onResponse for user messages', () => {
    const mockChatEvent: ChatEvent = {
      eventType: 'chat_event',
      userId,
      timestamp: '2024-01-01T12:00:00Z',
      payload: {
        message: {
          id: 'user-msg-1',
          type: 'TEXT',
          content: 'Hello AI',
          timestamp: '2024-01-01T12:00:00Z'
        },
        type: 'user_message'
      }
    };

    mockUseChatSubscription.mockReturnValue({
      data: mockChatEvent,
      error: null
    });

    render(
      <AIResponseHandler
        userId={userId}
        onResponse={mockOnResponse}
        onError={mockOnError}
      />
    );

    expect(mockOnResponse).not.toHaveBeenCalled();
  });

  it('calls onError when subscription error occurs', () => {
    const subscriptionError = new Error('Subscription failed');
    
    mockUseChatSubscription.mockReturnValue({
      data: null,
      error: subscriptionError
    });

    render(
      <AIResponseHandler
        userId={userId}
        onResponse={mockOnResponse}
        onError={mockOnError}
      />
    );

    expect(mockOnError).toHaveBeenCalledWith(
      'Lost connection to AI service. Please refresh the page.'
    );
  });

  it('calls onError when chat event processing fails', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Invalid chat event that will cause processing to fail
    const invalidChatEvent = {
      eventType: 'chat_event',
      userId,
      timestamp: '2024-01-01T12:00:00Z',
      payload: null // This will cause an error
    } as any;

    mockUseChatSubscription.mockReturnValue({
      data: invalidChatEvent,
      error: null
    });

    render(
      <AIResponseHandler
        userId={userId}
        onResponse={mockOnResponse}
        onError={mockOnError}
      />
    );

    expect(mockOnError).toHaveBeenCalledWith('Failed to process AI response');
    expect(consoleError).toHaveBeenCalled();
    
    consoleError.mockRestore();
  });

  it('handles voice message responses', () => {
    const mockChatEvent: ChatEvent = {
      eventType: 'chat_event',
      userId,
      timestamp: '2024-01-01T12:00:00Z',
      payload: {
        message: {
          id: 'voice-msg-1',
          type: 'VOICE',
          content: 'Voice response transcription',
          timestamp: '2024-01-01T12:00:00Z',
          voiceSessionId: 'voice-session-123'
        },
        type: 'ai_response'
      }
    };

    mockUseChatSubscription.mockReturnValue({
      data: mockChatEvent,
      error: null
    });

    render(
      <AIResponseHandler
        userId={userId}
        onResponse={mockOnResponse}
        onError={mockOnError}
      />
    );

    expect(mockOnResponse).toHaveBeenCalledWith({
      id: 'voice-msg-1',
      type: 'VOICE',
      content: 'Voice response transcription',
      timestamp: '2024-01-01T12:00:00Z',
      voiceSessionId: 'voice-session-123',
      isUser: false,
      isLoading: false
    });
  });

  it('handles media message responses', () => {
    const mockChatEvent: ChatEvent = {
      eventType: 'chat_event',
      userId,
      timestamp: '2024-01-01T12:00:00Z',
      payload: {
        message: {
          id: 'media-msg-1',
          type: 'MEDIA',
          content: 'Generated image description',
          timestamp: '2024-01-01T12:00:00Z',
          metadata: { mediaType: 'image', url: 'https://example.com/image.jpg' }
        },
        type: 'ai_response'
      }
    };

    mockUseChatSubscription.mockReturnValue({
      data: mockChatEvent,
      error: null
    });

    render(
      <AIResponseHandler
        userId={userId}
        onResponse={mockOnResponse}
        onError={mockOnError}
      />
    );

    expect(mockOnResponse).toHaveBeenCalledWith({
      id: 'media-msg-1',
      type: 'MEDIA',
      content: 'Generated image description',
      timestamp: '2024-01-01T12:00:00Z',
      metadata: { mediaType: 'image', url: 'https://example.com/image.jpg' },
      isUser: false,
      isLoading: false
    });
  });

  it('subscribes to chat events for the correct user', () => {
    mockUseChatSubscription.mockReturnValue({
      data: null,
      error: null
    });

    render(
      <AIResponseHandler
        userId={userId}
        onResponse={mockOnResponse}
        onError={mockOnError}
      />
    );

    expect(mockUseChatSubscription).toHaveBeenCalledWith(userId);
  });
});