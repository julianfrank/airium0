import React, { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

export interface AudioStreamerProps {
  onAudioData: (audioData: string) => void;
  onError: (error: string) => void;
  audioFormat?: string;
  sampleRate?: number;
  chunkSize?: number;
  streamingInterval?: number;
}

export interface AudioStreamerRef {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isRecording: () => boolean;
}

export const AudioStreamer = forwardRef<AudioStreamerRef, AudioStreamerProps>(({
  onAudioData,
  onError,
  audioFormat = 'webm',
  sampleRate = 16000,
  chunkSize = 1024,
  streamingInterval = 100
}, ref) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder with appropriate MIME type
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available events
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Convert to base64 and send immediately for streaming
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            const audioData = base64Data.split(',')[1]; // Remove data URL prefix
            onAudioData(audioData);
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        onError('Recording error occurred');
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped');
        isRecordingRef.current = false;
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording with time slices for streaming
      mediaRecorder.start(streamingInterval);
      isRecordingRef.current = true;

      console.log('Recording started with format:', mimeType);
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          onError('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          onError('No microphone found. Please connect a microphone and try again.');
        } else {
          onError(`Failed to start recording: ${error.message}`);
        }
      } else {
        onError('Failed to start recording: Unknown error');
      }
    }
  }, [onAudioData, onError, sampleRate, streamingInterval]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
  }, []);

  const isRecording = useCallback(() => {
    return isRecordingRef.current;
  }, []);

  // Get supported MIME type for audio recording
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Fallback to default
    return 'audio/webm';
  };

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
    isRecording
  }), [startRecording, stopRecording, isRecording]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  // This component doesn't render anything visible
  return null;
});

AudioStreamer.displayName = 'AudioStreamer';

export default AudioStreamer;