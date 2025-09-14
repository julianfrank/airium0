import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoiceRecorder } from '../VoiceRecorder';

// Mock the UI components
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, disabled, size, variant, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  )
}));

vi.mock('../../ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>
      {children}
    </div>
  )
}));

vi.mock('../../lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  state: string = 'inactive';
  
  constructor(stream: MediaStream, options?: any) {}
  
  start = vi.fn(() => {
    this.state = 'recording';
  });
  
  stop = vi.fn(() => {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  });
}

// Mock getUserMedia
const mockGetUserMedia = vi.fn();

// Mock URL.createObjectURL
const mockCreateObjectURL = vi.fn(() => 'mock-url');

describe('VoiceRecorder', () => {
  const mockOnRecordingComplete = vi.fn();

  beforeEach(() => {
    // Setup mocks
    global.MediaRecorder = MockMediaRecorder as any;
    global.navigator.mediaDevices = {
      getUserMedia: mockGetUserMedia
    } as any;
    global.URL.createObjectURL = mockCreateObjectURL;
    
    mockOnRecordingComplete.mockClear();
    mockGetUserMedia.mockClear();
    mockCreateObjectURL.mockClear();
    
    // Mock successful media access
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders start recording button initially', () => {
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);
    
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('shows microphone permission note', () => {
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);
    
    expect(screen.getByText('Microphone access required for voice recording')).toBeInTheDocument();
  });

  it('starts recording when start button is clicked', async () => {
    vi.useFakeTimers();
    
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);
    
    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    });
    
    vi.useRealTimers();
  });

  it('updates timer during recording', async () => {
    vi.useFakeTimers();
    
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);
    
    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument();
    });
    
    // Advance timer by 5 seconds
    vi.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(screen.getByText('0:05')).toBeInTheDocument();
    });
    
    vi.useRealTimers();
  });

  it('stops recording when stop button is clicked', async () => {
    vi.useFakeTimers();
    
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);
    
    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    });
    
    const stopButton = screen.getByRole('button', { name: /stop recording/i });
    fireEvent.click(stopButton);
    
    await waitFor(() => {
      expect(screen.getByText(/recording completed/i)).toBeInTheDocument();
    });
    
    vi.useRealTimers();
  });

  it('shows playback controls after recording', async () => {
    vi.useFakeTimers();
    
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);
    
    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    });
    
    const stopButton = screen.getByRole('button', { name: /stop recording/i });
    fireEvent.click(stopButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save recording/i })).toBeInTheDocument();
    });
    
    vi.useRealTimers();
  });

  it('calls onRecordingComplete when save button is clicked', async () => {
    vi.useFakeTimers();
    
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);
    
    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    });
    
    const stopButton = screen.getByRole('button', { name: /stop recording/i });
    fireEvent.click(stopButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save recording/i })).toBeInTheDocument();
    });
    
    const saveButton = screen.getByRole('button', { name: /save recording/i });
    fireEvent.click(saveButton);
    
    expect(mockOnRecordingComplete).toHaveBeenCalledWith(expect.any(Blob));
    
    vi.useRealTimers();
  });

  it('discards recording when discard button is clicked', async () => {
    vi.useFakeTimers();
    
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);
    
    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    });
    
    const stopButton = screen.getByRole('button', { name: /stop recording/i });
    fireEvent.click(stopButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    });
    
    const discardButton = screen.getByRole('button', { name: /discard/i });
    fireEvent.click(discardButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
    });
    
    expect(mockOnRecordingComplete).not.toHaveBeenCalled();
    
    vi.useRealTimers();
  });

  it('handles microphone access error', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
    
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);
    
    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to access microphone/i)).toBeInTheDocument();
    });
  });

  it('auto-stops at max duration', async () => {
    vi.useFakeTimers();
    
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} maxDuration={5} />);
    
    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument();
    });
    
    // Advance timer to max duration
    vi.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(screen.getByText(/recording completed/i)).toBeInTheDocument();
    });
    
    vi.useRealTimers();
  });

  it('disables recording when disabled prop is true', () => {
    render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} disabled={true} />);
    
    const startButton = screen.getByRole('button', { name: /start recording/i });
    expect(startButton).toBeDisabled();
  });
});