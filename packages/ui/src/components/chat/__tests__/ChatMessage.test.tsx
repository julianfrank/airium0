import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatMessage } from '../ChatMessage';
import type { Message } from '../types';

describe('ChatMessage', () => {
  const baseMessage: Message = {
    id: 'test-message-1',
    type: 'TEXT',
    content: 'Hello, this is a test message',
    timestamp: '2024-01-01T12:00:00Z',
    isUser: false,
    isLoading: false
  };

  it('renders user message correctly', () => {
    const userMessage: Message = {
      ...baseMessage,
      isUser: true
    };

    render(<ChatMessage message={userMessage} />);
    
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
    expect(screen.getByText('12:00 PM')).toBeInTheDocument();
  });

  it('renders AI message correctly', () => {
    render(<ChatMessage message={baseMessage} />);
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    const loadingMessage: Message = {
      ...baseMessage,
      isLoading: true,
      content: ''
    };

    render(<ChatMessage message={loadingMessage} />);
    
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const errorMessage: Message = {
      ...baseMessage,
      error: 'Something went wrong'
    };

    render(<ChatMessage message={errorMessage} />);
    
    expect(screen.getByText('Error: Something went wrong')).toBeInTheDocument();
  });

  it('renders voice message type', () => {
    const voiceMessage: Message = {
      ...baseMessage,
      type: 'VOICE',
      content: 'This is a voice transcription'
    };

    render(<ChatMessage message={voiceMessage} />);
    
    expect(screen.getByText('Voice message transcription:')).toBeInTheDocument();
    expect(screen.getByText('This is a voice transcription')).toBeInTheDocument();
    expect(screen.getByText('voice')).toBeInTheDocument();
  });

  it('renders media message type', () => {
    const mediaMessage: Message = {
      ...baseMessage,
      type: 'MEDIA',
      content: 'Media file description'
    };

    render(<ChatMessage message={mediaMessage} />);
    
    expect(screen.getByText('Media content:')).toBeInTheDocument();
    expect(screen.getByText('Media file description')).toBeInTheDocument();
    expect(screen.getByText('media')).toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    const message: Message = {
      ...baseMessage,
      timestamp: '2024-01-01T15:30:00Z'
    };

    render(<ChatMessage message={message} />);
    
    expect(screen.getByText('3:30 PM')).toBeInTheDocument();
  });

  it('handles multiline content', () => {
    const multilineMessage: Message = {
      ...baseMessage,
      content: 'Line 1\nLine 2\nLine 3'
    };

    render(<ChatMessage message={multilineMessage} />);
    
    expect(screen.getByText('Line 1\nLine 2\nLine 3')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChatMessage message={baseMessage} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows different styling for user vs AI messages', () => {
    const { rerender, container } = render(<ChatMessage message={baseMessage} />);
    
    const aiMessageElement = container.firstChild;
    expect(aiMessageElement).toHaveClass('bg-muted', 'mr-8');
    
    const userMessage: Message = { ...baseMessage, isUser: true };
    rerender(<ChatMessage message={userMessage} />);
    
    const userMessageElement = container.firstChild;
    expect(userMessageElement).toHaveClass('bg-primary/10', 'ml-8');
  });

  it('shows correct icons for user vs AI', () => {
    const { rerender } = render(<ChatMessage message={baseMessage} />);
    
    // AI message should show bot icon
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    
    const userMessage: Message = { ...baseMessage, isUser: true };
    rerender(<ChatMessage message={userMessage} />);
    
    // User message should show user icon
    expect(screen.getByText('You')).toBeInTheDocument();
  });
});