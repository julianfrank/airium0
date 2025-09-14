import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioStreamer } from '../AudioStreamer';

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

describe('AudioStreamer', () => {
  const defaultProps = {
    onAudioData: vi.fn(),
    onError: vi.fn()
  };

  let audioStreamerRef: React.RefObject<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    audioStreamerRef = React.createRef();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} />);
    expect(audioStreamerRef.current).toBeDefined();
  });

  it('exposes correct methods through ref', () => {
    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} />);
    
    expect(audioStreamerRef.current.startRecording).toBeDefined();
    expect(audioStreamerRef.current.stopRecording).toBeDefined();
    expect(audioStreamerRef.current.isRecording).toBeDefined();
    expect(typeof audioStreamerRef.current.startRecording).toBe('function');
    expect(typeof audioStreamerRef.current.stopRecording).toBe('function');
    expect(typeof audioStreamerRef.current.isRecording).toBe('function');
  });

  it('starts recording successfully', async () => {
    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} />);
    
    await act(async () => {
      await audioStreamerRef.current.startRecording();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    expect(mockMediaRecorder.start).toHaveBeenCalledWith(100);
  });

  it('handles microphone access denied error', async () => {
    const onError = vi.fn();
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
      new Error('NotAllowedError')
    );
    Object.defineProperty(Error.prototype, 'name', {
      value: 'NotAllowedError',
      configurable: true
    });

    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} onError={onError} />);
    
    await act(async () => {
      await audioStreamerRef.current.startRecording();
    });

    expect(onError).toHaveBeenCalledWith(
      'Microphone access denied. Please allow microphone access and try again.'
    );
  });

  it('handles no microphone found error', async () => {
    const onError = vi.fn();
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
      new Error('NotFoundError')
    );
    Object.defineProperty(Error.prototype, 'name', {
      value: 'NotFoundError',
      configurable: true
    });

    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} onError={onError} />);
    
    await act(async () => {
      await audioStreamerRef.current.startRecording();
    });

    expect(onError).toHaveBeenCalledWith(
      'No microphone found. Please connect a microphone and try again.'
    );
  });

  it('stops recording successfully', async () => {
    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} />);
    
    // Start recording first
    await act(async () => {
      await audioStreamerRef.current.startRecording();
    });

    // Stop recording
    act(() => {
      audioStreamerRef.current.stopRecording();
    });

    expect(mockMediaRecorder.stop).toHaveBeenCalled();
  });

  it('returns correct recording state', async () => {
    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} />);
    
    // Initially not recording
    expect(audioStreamerRef.current.isRecording()).toBe(false);
    
    // After starting recording
    await act(async () => {
      await audioStreamerRef.current.startRecording();
    });
    
    expect(audioStreamerRef.current.isRecording()).toBe(true);
  });

  it('processes audio data and calls onAudioData', async () => {
    const onAudioData = vi.fn();
    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} onAudioData={onAudioData} />);
    
    await act(async () => {
      await audioStreamerRef.current.startRecording();
    });

    // Simulate data available event
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
    const mockEvent = { data: mockBlob };
    
    act(() => {
      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable(mockEvent);
      }
    });

    // Simulate FileReader completion
    const mockFileReader = new FileReader();
    act(() => {
      if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
      }
    });

    expect(onAudioData).toHaveBeenCalledWith('SGVsbG8gV29ybGQ=');
  });

  it('handles MediaRecorder error', async () => {
    const onError = vi.fn();
    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} onError={onError} />);
    
    await act(async () => {
      await audioStreamerRef.current.startRecording();
    });

    // Simulate MediaRecorder error
    const mockError = new Event('error');
    act(() => {
      if (mockMediaRecorder.onerror) {
        mockMediaRecorder.onerror(mockError);
      }
    });

    expect(onError).toHaveBeenCalledWith('Recording error occurred');
  });

  it('cleans up resources on stop', async () => {
    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} />);
    
    await act(async () => {
      await audioStreamerRef.current.startRecording();
    });

    // Simulate stop event
    act(() => {
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }
    });

    expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('uses custom audio configuration', async () => {
    const customProps = {
      ...defaultProps,
      sampleRate: 44100,
      streamingInterval: 200
    };

    render(<AudioStreamer ref={audioStreamerRef} {...customProps} />);
    
    await act(async () => {
      await audioStreamerRef.current.startRecording();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        sampleRate: 44100,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    expect(mockMediaRecorder.start).toHaveBeenCalledWith(200);
  });

  it('selects appropriate MIME type', () => {
    // Test MIME type selection logic
    (MediaRecorder.isTypeSupported as any)
      .mockReturnValueOnce(true)  // audio/webm;codecs=opus
      .mockReturnValueOnce(false) // audio/webm
      .mockReturnValueOnce(false) // audio/ogg;codecs=opus
      .mockReturnValueOnce(false) // audio/ogg
      .mockReturnValueOnce(false) // audio/wav
      .mockReturnValueOnce(false); // audio/mp4

    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} />);
    
    expect(MediaRecorder.isTypeSupported).toHaveBeenCalledWith('audio/webm;codecs=opus');
  });

  it('falls back to default MIME type when none supported', () => {
    (MediaRecorder.isTypeSupported as any).mockReturnValue(false);

    render(<AudioStreamer ref={audioStreamerRef} {...defaultProps} />);
    
    // Should still work with fallback
    expect(audioStreamerRef.current).toBeDefined();
  });
});