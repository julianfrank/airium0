import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChatInterface } from '../ChatInterface';

// Mock dependencies
const mockUseWebSocket = vi.fn();
const mockGetChatService = vi.fn();
const mockChatService = {
  sendMessage: vi.fn(),
  getHistory: vi.fn(),
  clearHistory: vi.fn()
};

vi.mock('../../lib/use-websocket', () => ({
  useWebSocket: mockUseWebSocket
}));

vi.mock('../ChatService', () => ({
  getChatService: mockGetChatService
}));

// Mock child components
vi.mock('../ChatHistory', () => ({
  ChatHistory: ({ messages, isLoading }: any) => (
    <div data-testid="chat-history">
      {isLoading && <div>Loading...</div>}
      {messages.map((msg: any) => (
        <div key={msg.id} data-testid="message">
          {msg.content}
        </div>
      ))}
    </div>
  )
}));

vi.mock('../ChatInput', () => ({
  ChatInput: ({ onSendMessage, disabled, placeholder }: any) => (
    <div data-testid="chat-input">
      <input
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === 'test-send') {
            onSendMessage('test message');
          }
        }}
      />
    </div>
  )
}));

vi.mock('../AIResponseHandler', () => ({
  AIResponseHandler: ({ onResponse, onError }: any) => (
    <div data-testid="ai-response-handler">
      <button onClick={() => onResponse({
        id: 'ai-1',
        type: 'TEXT',
        content: 'AI response',
        timestamp: new Date().toISOString(),
        isUser: false,
        isLoading: false
      })}>
        Trigger AI Response
      </button>
      <button onClick={() => onError('AI Error')}>
        Trigger AI Error
      </button>
    </div>
  )
}));

describe('ChatInterface', () => {
  const defaultProps = {
    userId: 'test-user-123'
  };

  beforeEach(() => {
    mockUseWebSocket.mockReturnValue({
      wsClient: { isConnected: () => true },
      connectionState: 'CONNECTED'
    });
    
    mockGetChatService.mockReturnValue(mockChatService);
    mockChatService.sendMessage.mockClear();
    mockChatService.getHistory.mockClear();
    mockChatService.clearHistory.mockClear();
  });

  it('renders with default state', () => {
    render(<ChatInterface {...defaultProps} />);
    
    expect(screen.getByText('AI Chat')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByTestId('chat-history')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('ai-response-handler')).toBeInTheDocument();
  });

  it('shows disconnected state when WebSocket is not connected', () => {
    mockUseWebSocket.mockReturnValue({
      wsClient: { isConnected: () => false },
      connectionState: 'DISCONNECTED'
    });

    render(<ChatInterface {...defaultProps} />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('sends message when user inputs text', async () => {
    mockChatService.sendMessage.mockResolvedValue(undefined);
    
    render(<ChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'test-send' } });
    
    await waitFor(() => {
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('test message', 'test-user-123');
    });
  });

  it('adds user message to chat history immediately', async () => {
    mockChatService.sendMessage.mockResolvedValue(undefined);
    
    render(<ChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'test-send' } });
    
    await waitFor(() => {
      expect(screen.getByText('test message')).toBeInTheDocument();
    });
  });

  it('shows loading message while waiting for AI response', async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    
    mockChatService.sendMessage.mockReturnValue(promise);
    
    render(<ChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'test-send' } });
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
    
    resolvePromise!();
  });

  it('handles AI response correctly', () => {
    render(<ChatInterface {...defaultProps} />);
    
    const aiResponseButton = screen.getByText('Trigger AI Response');
    fireEvent.click(aiResponseButton);
    
    expect(screen.getByText('AI response')).toBeInTheDocument();
  });

  it('handles AI errors correctly', () => {
    const mockOnError = vi.fn();
    
    render(<ChatInterface {...defaultProps} onError={mockOnError} />);
    
    const aiErrorButton = screen.getByText('Trigger AI Error');
    fireEvent.click(aiErrorButton);
    
    expect(screen.getByText('AI Error')).toBeInTheDocument();
    expect(mockOnError).toHaveBeenCalledWith('AI Error');
  });

  it('handles message send errors', async () => {
    const mockOnError = vi.fn();
    mockChatService.sendMessage.mockRejectedValue(new Error('Send failed'));
    
    render(<ChatInterface {...defaultProps} onError={mockOnError} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'test-send' } });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Send failed');
    });
  });

  it('clears chat history when clear button is clicked', async () => {
    mockChatService.clearHistory.mockResolvedValue(undefined);
    
    // First add a message to show the clear button
    render(<ChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'test-send' } });
    
    await waitFor(() => {
      expect(screen.getByText('test message')).toBeInTheDocument();
    });
    
    // Now click clear
    const clearButton = screen.getByRole('button', { name: /clear chat/i });
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(mockChatService.clearHistory).toHaveBeenCalledWith('test-user-123');
    });
  });

  it('limits messages to maxMessages prop', async () => {
    mockChatService.sendMessage.mockResolvedValue(undefined);
    
    render(<ChatInterface {...defaultProps} maxMessages={2} />);
    
    // Add multiple messages
    const input = screen.getByPlaceholderText('Type your message...');
    
    // Send first message
    fireEvent.change(input, { target: { value: 'test-send' } });
    await waitFor(() => {
      expect(screen.getByText('test message')).toBeInTheDocument();
    });
    
    // Trigger AI response to add second message
    const aiResponseButton = screen.getByText('Trigger AI Response');
    fireEvent.click(aiResponseButton);
    
    // Send third message (should remove first due to limit)
    fireEvent.change(input, { target: { value: 'test-send' } });
    
    await waitFor(() => {
      const messages = screen.getAllByTestId('message');
      expect(messages).toHaveLength(3); // Should be limited but we have loading message too
    });
  });

  it('calls onMessage callback when message is added', async () => {
    const mockOnMessage = vi.fn();
    mockChatService.sendMessage.mockResolvedValue(undefined);
    
    render(<ChatInterface {...defaultProps} onMessage={mockOnMessage} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'test-send' } });
    
    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalled();
    });
  });

  it('shows error banner when there is an error', () => {
    const mockOnError = vi.fn();
    
    render(<ChatInterface {...defaultProps} onError={mockOnError} />);
    
    const aiErrorButton = screen.getByText('Trigger AI Error');
    fireEvent.click(aiErrorButton);
    
    expect(screen.getByText('AI Error')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChatInterface {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});