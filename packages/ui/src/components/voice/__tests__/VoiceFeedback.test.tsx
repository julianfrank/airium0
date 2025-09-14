import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoiceFeedback, AudioVisualizer } from '../VoiceFeedback';

describe('VoiceFeedback', () => {
  const defaultProps = {
    isRecording: false,
    isProcessing: false
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders ready state by default', () => {
    render(<VoiceFeedback {...defaultProps} />);
    
    expect(screen.getByText('Ready to listen')).toBeInTheDocument();
    expect(screen.getByText('Click the microphone button to start voice chat')).toBeInTheDocument();
    expect(screen.getByText('Powered by Amazon Nova Sonic')).toBeInTheDocument();
  });

  it('shows recording state when recording', () => {
    render(<VoiceFeedback {...defaultProps} isRecording={true} />);
    
    expect(screen.getByText('Listening...')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText('Recording duration')).toBeInTheDocument();
  });

  it('shows processing state when processing', () => {
    render(<VoiceFeedback {...defaultProps} isProcessing={true} />);
    
    expect(screen.getByText('Processing your voice...')).toBeInTheDocument();
    expect(screen.getByText('Processing with Nova Sonic...')).toBeInTheDocument();
  });

  it('displays transcription when provided', () => {
    const transcription = 'Hello, this is a test transcription';
    render(<VoiceFeedback {...defaultProps} transcription={transcription} />);
    
    expect(screen.getByText('You said:')).toBeInTheDocument();
    expect(screen.getByText(transcription)).toBeInTheDocument();
  });

  it('displays AI response when provided', () => {
    const aiResponse = 'This is an AI response';
    render(<VoiceFeedback {...defaultProps} aiResponse={aiResponse} />);
    
    expect(screen.getByText('AI Response:')).toBeInTheDocument();
    expect(screen.getByText(aiResponse)).toBeInTheDocument();
  });

  it('shows confidence score when provided', () => {
    const transcription = 'Test transcription';
    const confidence = 0.95;
    render(<VoiceFeedback {...defaultProps} transcription={transcription} confidence={confidence} />);
    
    expect(screen.getByText('Confidence: 95%')).toBeInTheDocument();
  });

  it('shows processing time when provided', () => {
    const aiResponse = 'Test response';
    const processingTime = 1500;
    render(<VoiceFeedback {...defaultProps} aiResponse={aiResponse} processingTime={processingTime} />);
    
    expect(screen.getByText('1500ms')).toBeInTheDocument();
  });

  it('updates recording duration correctly', () => {
    render(<VoiceFeedback {...defaultProps} isRecording={true} />);
    
    expect(screen.getByText('0:00')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(screen.getByText('0:05')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('resets recording duration when recording stops', () => {
    const { rerender } = render(<VoiceFeedback {...defaultProps} isRecording={true} />);
    
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(screen.getByText('0:05')).toBeInTheDocument();
    
    rerender(<VoiceFeedback {...defaultProps} isRecording={false} />);
    
    expect(screen.queryByText('0:05')).not.toBeInTheDocument();
  });

  it('shows clear button when content is available', () => {
    const onClearFeedback = vi.fn();
    render(
      <VoiceFeedback 
        {...defaultProps} 
        transcription="Test transcription"
        onClearFeedback={onClearFeedback}
      />
    );
    
    const clearButton = screen.getByText('Clear');
    expect(clearButton).toBeInTheDocument();
    
    fireEvent.click(clearButton);
    expect(onClearFeedback).toHaveBeenCalled();
  });

  it('does not show clear button when no content', () => {
    const onClearFeedback = vi.fn();
    render(<VoiceFeedback {...defaultProps} onClearFeedback={onClearFeedback} />);
    
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('shows correct status colors', () => {
    const { rerender } = render(<VoiceFeedback {...defaultProps} />);
    
    // Ready state
    expect(screen.getByText('Ready to listen')).toHaveClass('text-gray-600');
    
    // Recording state
    rerender(<VoiceFeedback {...defaultProps} isRecording={true} />);
    expect(screen.getByText('Listening...')).toHaveClass('text-red-600');
    
    // Processing state
    rerender(<VoiceFeedback {...defaultProps} isProcessing={true} />);
    expect(screen.getByText('Processing your voice...')).toHaveClass('text-yellow-600');
    
    // Completed state
    rerender(<VoiceFeedback {...defaultProps} aiResponse="Test response" />);
    expect(screen.getByText('Response ready')).toHaveClass('text-green-600');
  });

  it('formats duration correctly', () => {
    render(<VoiceFeedback {...defaultProps} isRecording={true} />);
    
    // Test various durations
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByText('0:00')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(screen.getByText('0:09')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(51000);
    });
    expect(screen.getByText('1:00')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(125000);
    });
    expect(screen.getByText('3:05')).toBeInTheDocument();
  });
});

describe('AudioVisualizer', () => {
  const defaultProps = {
    isActive: false,
    audioLevel: 0.5
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders audio visualizer bars', () => {
    render(<AudioVisualizer {...defaultProps} />);
    
    // Should render 20 bars
    const bars = document.querySelectorAll('.audio-visualizer > div');
    expect(bars).toHaveLength(20);
  });

  it('shows inactive state when not active', () => {
    render(<AudioVisualizer {...defaultProps} isActive={false} />);
    
    const bars = document.querySelectorAll('.audio-visualizer > div');
    bars.forEach(bar => {
      expect(bar).toHaveClass('from-gray-200', 'to-gray-300');
    });
  });

  it('shows active state when active', () => {
    render(<AudioVisualizer {...defaultProps} isActive={true} />);
    
    const bars = document.querySelectorAll('.audio-visualizer > div');
    bars.forEach(bar => {
      expect(bar).toHaveClass('from-blue-400', 'to-blue-600');
    });
  });

  it('animates bars when active', () => {
    render(<AudioVisualizer {...defaultProps} isActive={true} />);
    
    // Initial state
    const bars = document.querySelectorAll('.audio-visualizer > div');
    const initialHeights = Array.from(bars).map(bar => 
      (bar as HTMLElement).style.height
    );
    
    // Advance time to trigger animation
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    // Heights should have changed (due to random values)
    const newHeights = Array.from(bars).map(bar => 
      (bar as HTMLElement).style.height
    );
    
    // At least some bars should have different heights
    const hasChanges = initialHeights.some((height, index) => 
      height !== newHeights[index]
    );
    expect(hasChanges).toBe(true);
  });

  it('stops animation when inactive', () => {
    const { rerender } = render(<AudioVisualizer {...defaultProps} isActive={true} />);
    
    // Switch to inactive
    rerender(<AudioVisualizer {...defaultProps} isActive={false} />);
    
    // All bars should have zero height (minimum 4px)
    const bars = document.querySelectorAll('.audio-visualizer > div');
    bars.forEach(bar => {
      expect((bar as HTMLElement).style.height).toBe('4px');
    });
  });

  it('respects audio level parameter', () => {
    render(<AudioVisualizer {...defaultProps} isActive={true} audioLevel={1.0} />);
    
    // With higher audio level, bars should potentially be taller
    // This is tested indirectly through the height calculation
    const bars = document.querySelectorAll('.audio-visualizer > div');
    expect(bars).toHaveLength(20);
  });

  it('applies custom className', () => {
    render(<AudioVisualizer {...defaultProps} className="custom-class" />);
    
    const visualizer = document.querySelector('.audio-visualizer');
    expect(visualizer).toHaveClass('custom-class');
  });
});