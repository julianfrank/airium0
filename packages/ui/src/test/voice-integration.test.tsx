import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoiceChat } from '../components/voice/VoiceChat';
import { WebSocketProvider } from '../components/websocket/WebSocketProvider';
import { SubscriptionProvider } from '../components/appsync/SubscriptionProvider';

// Mock the WebSocket and AppSync dependencies
vi.mock('../lib/use-websocket', () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: true,
    sendVoiceMessage: vi.fn(),
    startVoiceSession: vi.fn(),
    endVoiceSession: vi.fn(),
    onMessage: vi.fn(() => () => {})
  }))
}));

vi.mock('../lib/use-appsync-subscriptions', () => ({
  useVoiceSessionSubscription: vi.fn(() => ({
    data: null,
    isConnected: true,
    error: null
  }))
}));

// Mock Web APIs
const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }])
};

const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  ondataavailable: null,
  onerror: null,
  onstop: null,
  state: 'inactive'
};

Object.defineProperty(window, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream))
    }
  },
  writable: true
});

Object.defineProperty(window, 'MediaRecorder', {
  value: vi.fn(() => mockMediaRecorder),
  writable: true
});

Object.defineProperty(MediaRecorder, 'isTypeSupported', {
  value: vi.fn(() => true),
  writable: true
});

Object.defineProperty(window, 'FileReader', {
  value: vi.fn(() => ({
    readAsDataURL: vi.fn(),
    onloadend: null,
    result: 'data:audio/webm;base64,SGVsbG8gV29ybGQ='
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

describe('Voice Chat Integration', () => {
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <WebSocketProvider>
      <SubscriptionProvider>
        {children}
      </SubscriptionProvider>
    </WebSocketProvider>
  );

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

  it('completes full voice interaction workflow', async () => {
    const onTranscription = vi.fn();
    const onAIResponse = vi.fn();
    const { useVoiceSessionSubscription } = require('../lib/use-appsync-subscriptions');

    render(
      <TestWrapper>
        <VoiceChat 
          {...defaultProps} 
          onTranscription={onTranscription}
          onAIResponse={onAIResponse}
        />
      </TestWrapper>
    );

    // 1. Start recording
    const startButton = screen.getByText('🎤 Start Recording');
    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(screen.getByText('⏹️ Stop Recording')).toBeInTheDocument();
    });

    // 2. Simulate recording in progress
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(mockMediaRecorder.start).toHaveBeenCalled();

    // 3. Stop recording
    const stopButton = screen.getByText('⏹️ Stop Recording');
    await act(async () => {
      fireEvent.click(stopButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    // 4. Simulate voice session events - transcription
    act(() => {
      useVoiceSessionSubscription.mockReturnValue({
        data: {
          payload: {
            status: 'completed',
            data: { transcription: 'Hello, how are you today?' }
          }
        },
        isConnected: true,
        error: null
      });
    });

    await waitFor(() => {
      expect(screen.getByText('You said:')).toBeInTheDocument();
      expect(screen.getByText('Hello, how are you today?')).toBeInTheDocument();
      expect(onTranscription).toHaveBeenCalledWith('Hello, how are you today?');
    });

    // 5. Simulate AI response
    act(() => {
      useVoiceSessionSubscription.mockReturnValue({
        data: {
          payload: {
            status: 'completed',
            data: { 
              transcription: 'Hello, how are you today?',
              aiResponse: 'I am doing well, thank you for asking! How can I help you today?'
            }
          }
        },
        isConnected: true,
        error: null
      });
    });

    await waitFor(() => {
      expect(screen.getByText('AI Response:')).toBeInTheDocument();
      expect(screen.getByText('I am doing well, thank you for asking! How can I help you today?')).toBeInTheDocument();
      expect(onAIResponse).toHaveBeenCalledWith('I am doing well, thank you for asking! How can I help you today?');
    });
  });

  it('handles voice processing errors gracefully', async () => {
    const onError = vi.fn();
    const { useVoiceSessionSubscription } = require('../lib/use-appsync-subscriptions');

    render(
      <TestWrapper>
        <VoiceChat {...defaultProps} onError={onError} />
      </TestWrapper>
    );

    // Start recording
    const startButton = screen.getByText('🎤 Start Recording');
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Simulate error during processing
    act(() => {
      useVoiceSessionSubscription.mockReturnValue({
        data: {
          payload: {
            status: 'error',
            data: { error: 'Nova Sonic processing failed' }
          }
        },
        isConnected: true,
        error: null
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Nova Sonic processing failed')).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith('Nova Sonic processing failed');
    });
  });

  it('handles microphone access denied', async () => {
    const onError = vi.fn();
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
      Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
    );

    render(
      <TestWrapper>
        <VoiceChat {...defaultProps} onError={onError} />
      </TestWrapper>
    );

    const startButton = screen.getByText('🎤 Start Recording');
    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Microphone access denied')
      );
    });
  });

  it('handles WebSocket disconnection', async () => {
    const { useWebSocket } = require('../lib/use-websocket');
    useWebSocket.mockReturnValue({
      isConnected: false,
      sendVoiceMessage: vi.fn(),
      startVoiceSession: vi.fn(),
      endVoiceSession: vi.fn(),
      onMessage: vi.fn(() => () => {})
    });

    render(
      <TestWrapper>
        <VoiceChat {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    
    const startButton = screen.getByText('🎤 Start Recording');
    expect(startButton).toBeDisabled();
  });

  it('processes audio streaming correctly', async () => {
    const { useWebSocket } = require('../lib/use-websocket');
    const sendVoiceMessage = vi.fn();
    
    useWebSocket.mockReturnValue({
      isConnected: true,
      sendVoiceMessage,
      startVoiceSession: vi.fn(),
      endVoiceSession: vi.fn(),
      onMessage: vi.fn(() => () => {})
    });

    render(
      <TestWrapper>
        <VoiceChat {...defaultProps} />
      </TestWrapper>
    );

    // Start recording
    const startButton = screen.getByText('🎤 Start Recording');
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Simulate audio data being captured
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
    const mockEvent = { data: mockBlob };
    
    await act(async () => {
      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable(mockEvent);
      }
    });

    // Simulate FileReader completion
    const mockFileReader = new FileReader();
    await act(async () => {
      if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
      }
    });

    // Should send voice message via WebSocket
    expect(sendVoiceMessage).toHaveBeenCalledWith('SGVsbG8gV29ybGQ=', expect.any(String));
  });

  it('handles real-time voice feedback', async () => {
    const { useVoiceSessionSubscription } = require('../lib/use-appsync-subscriptions');

    render(
      <TestWrapper>
        <VoiceChat {...defaultProps} />
      </TestWrapper>
    );

    // Start recording
    const startButton = screen.getByText('🎤 Start Recording');
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Simulate processing status
    act(() => {
      useVoiceSessionSubscription.mockReturnValue({
        data: {
          payload: {
            status: 'processing',
            data: { audioFormat: 'webm', duration: 1500 }
          }
        },
        isConnected: true,
        error: null
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    // Simulate completion with confidence score
    act(() => {
      useVoiceSessionSubscription.mockReturnValue({
        data: {
          payload: {
            status: 'completed',
            data: { 
              transcription: 'Test transcription',
              confidence: 0.95,
              processingTime: 1200
            }
          }
        },
        isConnected: true,
        error: null
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Test transcription')).toBeInTheDocument();
    });
  });

  it('clears error messages when close button is clicked', async () => {
    const { useVoiceSessionSubscription } = require('../lib/use-appsync-subscriptions');

    render(
      <TestWrapper>
        <VoiceChat {...defaultProps} />
      </TestWrapper>
    );

    // Simulate error
    act(() => {
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
    });

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
    });
  });
});