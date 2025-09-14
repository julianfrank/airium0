import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoiceChat } from '../VoiceChat';

// Mock the hooks and components
vi.mock('../../lib/use-websocket', () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: true,
    sendVoiceMessage: vi.fn(),
    startVoiceSession: vi.fn(),
    endVoiceSession: vi.fn(),
    onMessage: vi.fn(() => () => {})
  }))
}));

vi.mock('../../lib/use-appsync-subscriptions', () => ({
  useVoiceSessionSubscription: vi.fn(() => ({
    data: null,
    isConnected: true,
    error: null
  }))
}));

vi.mock('../AudioStreamer', () => ({
  AudioStreamer: React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      isRecording: vi.fn(() => false)
    }));
    return React.createElement('div', { 'data-testid': 'audio-streamer' });
  })
}));

vi.mock('../VoiceSessionManager', () => ({
  VoiceSessionManager: React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      createSession: vi.fn(() => Promise.resolve('test-session-id')),
      endSession: vi.fn(() => Promise.resolve()),
      getSession: vi.fn(() => Promise.resolve(null)),
      updateSession: vi.fn(() => Promise.resolve()),
      getCurrentSession: vi.fn(() => null)
    }));
    return React.createElement('div', { 'data-testid': 'voice-session-manager' });
  })
}));

vi.mock('../appsync/EventSubscriptions', () => ({
  VoiceSessionEvents: ({ sessionId, onStatusChange }: any) => 
    React.createElement('div', { 
      'data-testid': 'voice-session-events',
      'data-session-id': sessionId
    })
}));

// Mock Web APIs
Object.defineProperty(window, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: vi.fn(() => Promise.resolve({
        getTracks: () => [{ stop: vi.fn() }]
      }))
    }
  },
  writable: true
});

Object.defineProperty(window, 'MediaRecorder', {
  value: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })),
  writable: true
});

Object.defineProperty(window, 'Audio', {
  value: vi.fn(() => ({
    play: vi.fn(() => Promise.resolve()),
    addEventListener: vi.fn()
  })),
  writable: true
});

describe('VoiceChat', () => {
  const defaultProps = {
    userId: 'test-user-123',
    onTranscription: vi.fn(),
    onAIResponse: vi.fn(),
    onError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders voice chat interface', () => {
    render(<VoiceChat {...defaultProps} />);
    
    expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    expect(screen.getByText('🎤 Start Recording')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows disconnected state when WebSocket is not connected', () => {
    const { useWebSocket } = require('../../lib/use-websocket');
    useWebSocket.mockReturnValue({
      isConnected: false,
      sendVoiceMessage: vi.fn(),
      startVoiceSession: vi.fn(),
      endVoiceSession: vi.fn(),
      onMessage: vi.fn(() => () => {})
    });

    render(<VoiceChat {...defaultProps} />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('handles start recording button click', async () => {
    render(<VoiceChat {...defaultProps} />);
    
    const startButton = screen.getByText('🎤 Start Recording');
    
    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(screen.getByText('⏹️ Stop Recording')).toBeInTheDocument();
    });
  });

  it('handles stop recording button click', async () => {
    render(<VoiceChat {...defaultProps} />);
    
    // Start recording first
    const startButton = screen.getByText('🎤 Start Recording');
    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(screen.getByText('⏹️ Stop Recording')).toBeInTheDocument();
    });

    // Stop recording
    const stopButton = screen.getByText('⏹️ Stop Recording');
    await act(async () => {
      fireEvent.click(stopButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('displays transcription when received', () => {
    const { useVoiceSessionSubscription } = require('../../lib/use-appsync-subscriptions');
    useVoiceSessionSubscription.mockReturnValue({
      data: {
        payload: {
          status: 'completed',
          data: { transcription: 'Hello, this is a test transcription' }
        }
      },
      isConnected: true,
      error: null
    });

    render(<VoiceChat {...defaultProps} />);
    
    expect(screen.getByText('You said:')).toBeInTheDocument();
    expect(screen.getByText('Hello, this is a test transcription')).toBeInTheDocument();
  });

  it('displays AI response when received', () => {
    const { useVoiceSessionSubscription } = require('../../lib/use-appsync-subscriptions');
    useVoiceSessionSubscription.mockReturnValue({
      data: {
        payload: {
          status: 'completed',
          data: { aiResponse: 'This is an AI response to your input' }
        }
      },
      isConnected: true,
      error: null
    });

    render(<VoiceChat {...defaultProps} />);
    
    expect(screen.getByText('AI Response:')).toBeInTheDocument();
    expect(screen.getByText('This is an AI response to your input')).toBeInTheDocument();
  });

  it('displays error messages', () => {
    const { useVoiceSessionSubscription } = require('../../lib/use-appsync-subscriptions');
    useVoiceSessionSubscription.mockReturnValue({
      data: {
        payload: {
          status: 'error',
          data: { error: 'Voice processing failed' }
        }
      },
      isConnected: true,
      error: null
    });

    render(<VoiceChat {...defaultProps} />);
    
    expect(screen.getByText('Voice processing failed')).toBeInTheDocument();
  });

  it('calls onTranscription callback when transcription is received', () => {
    const onTranscription = vi.fn();
    const { useVoiceSessionSubscription } = require('../../lib/use-appsync-subscriptions');
    
    useVoiceSessionSubscription.mockReturnValue({
      data: {
        payload: {
          status: 'completed',
          data: { transcription: 'Test transcription' }
        }
      },
      isConnected: true,
      error: null
    });

    render(<VoiceChat {...defaultProps} onTranscription={onTranscription} />);
    
    expect(onTranscription).toHaveBeenCalledWith('Test transcription');
  });

  it('calls onAIResponse callback when AI response is received', () => {
    const onAIResponse = vi.fn();
    const { useVoiceSessionSubscription } = require('../../lib/use-appsync-subscriptions');
    
    useVoiceSessionSubscription.mockReturnValue({
      data: {
        payload: {
          status: 'completed',
          data: { aiResponse: 'Test AI response' }
        }
      },
      isConnected: true,
      error: null
    });

    render(<VoiceChat {...defaultProps} onAIResponse={onAIResponse} />);
    
    expect(onAIResponse).toHaveBeenCalledWith('Test AI response');
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    const { useVoiceSessionSubscription } = require('../../lib/use-appsync-subscriptions');
    
    useVoiceSessionSubscription.mockReturnValue({
      data: {
        payload: {
          status: 'error',
          data: { error: 'Test error message' }
        }
      },
      isConnected: true,
      error: null
    });

    render(<VoiceChat {...defaultProps} onError={onError} />);
    
    expect(onError).toHaveBeenCalledWith('Test error message');
  });

  it('disables recording button when not connected', () => {
    const { useWebSocket } = require('../../lib/use-websocket');
    useWebSocket.mockReturnValue({
      isConnected: false,
      sendVoiceMessage: vi.fn(),
      startVoiceSession: vi.fn(),
      endVoiceSession: vi.fn(),
      onMessage: vi.fn(() => () => {})
    });

    render(<VoiceChat {...defaultProps} />);
    
    const startButton = screen.getByText('🎤 Start Recording');
    expect(startButton).toBeDisabled();
  });

  it('shows processing state correctly', () => {
    const { useVoiceSessionSubscription } = require('../../lib/use-appsync-subscriptions');
    useVoiceSessionSubscription.mockReturnValue({
      data: {
        payload: {
          status: 'processing',
          data: {}
        }
      },
      isConnected: true,
      error: null
    });

    render(<VoiceChat {...defaultProps} />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('clears error when close button is clicked', async () => {
    const { useVoiceSessionSubscription } = require('../../lib/use-appsync-subscriptions');
    useVoiceSessionSubscription.mockReturnValue({
      data: {
        payload: {
          status: 'error',
          data: { error: 'Test error' }
        }
      },
      isConnected: true,
      error: null
    });

    render(<VoiceChat {...defaultProps} />);
    
    expect(screen.getByText('Test error')).toBeInTheDocument();
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });
});