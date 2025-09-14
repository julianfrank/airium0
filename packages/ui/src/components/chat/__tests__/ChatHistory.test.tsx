import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatHistory } from '../ChatHistory';
import type { Message } from '../types';

describe('ChatHistory', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      type: 'TEXT',
      content: 'Hello, AI!',
      timestamp: '2024-01-01T12:00:00Z',
      isUser: true,
      isLoading: false
    },
    {
      id: 'msg-2',
      type: 'TEXT',
      content: 'Hello! How can I help you today?',
      timestamp: '2024-01-01T12:00:30Z',
      isUser: false,
      isLoading: false
    },
    {
      id: 'msg-3',
      type: 'VOICE',
      content: 'This is a voice message',
      timestamp: '2024-01-01T12:01:00Z',
      isUser: true,
      isLoading: false
    }
  ];

  it('renders empty state when no messages', () => {
    render(<ChatHistory messages={[]} />);
    
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(screen.getByText(/Type a message below to begin chatting/)).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true and no messages', () => {
    render(<ChatHistory messages={[]} isLoading={true} />);
    
    expect(screen.getByText('Loading chat history...')).toBeInTheDocument();
  });

  it('renders messages when provided', () => {
    render(<ChatHistory messages={mockMessages} />);
    
    expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
    expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    expect(screen.getByText('This is a voice message')).toBeInTheDocument();
  });

  it('renders messages in correct order', () => {
    render(<ChatHistory messages={mockMessages} />);
    
    const messages = screen.getAllByText(/Hello|This is a voice message/);
    expect(messages).toHaveLength(3);
    
    // Messages should appear in the order they were provided
    expect(messages[0]).toHaveTextContent('Hello, AI!');
    expect(messages[1]).toHaveTextContent('Hello! How can I help you today?');
    expect(messages[2]).toHaveTextContent('This is a voice message');
  });

  it('does not show loading indicator when messages exist', () => {
    render(<ChatHistory messages={mockMessages} isLoading={true} />);
    
    expect(screen.queryByText('Loading chat history...')).not.toBeInTheDocument();
    expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChatHistory messages={[]} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles single message', () => {
    const singleMessage = [mockMessages[0]];
    
    render(<ChatHistory messages={singleMessage} />);
    
    expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
    expect(screen.queryByText('Start a conversation')).not.toBeInTheDocument();
  });

  it('handles mixed message types', () => {
    render(<ChatHistory messages={mockMessages} />);
    
    // Should render text messages
    expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
    expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    
    // Should render voice message with proper label
    expect(screen.getByText('This is a voice message')).toBeInTheDocument();
    expect(screen.getByText('voice')).toBeInTheDocument();
  });

  it('shows proper message count', () => {
    render(<ChatHistory messages={mockMessages} />);
    
    // Should have 3 message containers (each message has its own container)
    const messageContainers = screen.getAllByText(/You|AI Assistant/);
    expect(messageContainers).toHaveLength(3);
  });

  it('handles empty message content gracefully', () => {
    const messagesWithEmpty: Message[] = [
      {
        id: 'empty-msg',
        type: 'TEXT',
        content: '',
        timestamp: '2024-01-01T12:00:00Z',
        isUser: true,
        isLoading: false
      }
    ];

    render(<ChatHistory messages={messagesWithEmpty} />);
    
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('handles loading messages', () => {
    const messagesWithLoading: Message[] = [
      ...mockMessages,
      {
        id: 'loading-msg',
        type: 'TEXT',
        content: '',
        timestamp: '2024-01-01T12:02:00Z',
        isUser: false,
        isLoading: true
      }
    ];

    render(<ChatHistory messages={messagesWithLoading} />);
    
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('handles error messages', () => {
    const messagesWithError: Message[] = [
      ...mockMessages,
      {
        id: 'error-msg',
        type: 'TEXT',
        content: 'Failed message',
        timestamp: '2024-01-01T12:02:00Z',
        isUser: false,
        isLoading: false,
        error: 'Network error'
      }
    ];

    render(<ChatHistory messages={messagesWithError} />);
    
    expect(screen.getByText('Error: Network error')).toBeInTheDocument();
  });
});