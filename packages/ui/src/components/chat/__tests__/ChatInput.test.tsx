import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  const mockOnSendMessage = vi.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
  });

  it('renders with default placeholder', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        placeholder="Custom placeholder" 
      />
    );
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('calls onSendMessage when form is submitted with valid text', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByRole('button');
    
    fireEvent.change(input, { target: { value: 'Hello, AI!' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('Hello, AI!');
    });
  });

  it('calls onSendMessage when Enter key is pressed', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    
    fireEvent.change(input, { target: { value: 'Hello via Enter!' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('Hello via Enter!');
    });
  });

  it('does not call onSendMessage when Shift+Enter is pressed', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    
    fireEvent.change(input, { target: { value: 'Hello with shift!' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('does not call onSendMessage with empty or whitespace-only text', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByRole('button');
    
    // Test empty string
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(button);
    
    // Test whitespace only
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(button);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('disables input and button when disabled prop is true', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={true} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByRole('button');
    
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('shows character count', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    expect(screen.getByText('5/1000')).toBeInTheDocument();
  });

  it('clears input after successful message send', async () => {
    mockOnSendMessage.mockResolvedValue(undefined);
    
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByRole('button');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('shows loading state while sending message', async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    
    mockOnSendMessage.mockReturnValue(promise);
    
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByRole('button');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(button);
    
    // Should show loading spinner
    expect(screen.getByRole('button')).toBeDisabled();
    
    // Resolve the promise
    resolvePromise!();
    
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  it('handles message send errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockOnSendMessage.mockRejectedValue(new Error('Send failed'));
    
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByRole('button');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to send message:', expect.any(Error));
    });
    
    consoleError.mockRestore();
  });
});