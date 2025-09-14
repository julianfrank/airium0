import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import type { VoiceRecorderProps, RecordingState } from './types';

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  maxDuration = 300, // 5 minutes default
  className,
  disabled = false
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    duration: 0
  });
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setRecordingState({ isRecording: true, duration: 0 });

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingState(prev => {
          const newDuration = prev.duration + 1;
          
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
            return prev;
          }
          
          return { ...prev, duration: newDuration };
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingState(prev => ({ 
        ...prev, 
        error: 'Failed to access microphone. Please check permissions.' 
      }));
    }
  }, [disabled, maxDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      setRecordingState(prev => ({ ...prev, isRecording: false }));
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recordingState.isRecording]);

  const playRecording = useCallback(() => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [audioUrl, isPlaying]);

  const saveRecording = useCallback(() => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
      // Reset state
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingState({ isRecording: false, duration: 0 });
      setIsPlaying(false);
    }
  }, [audioBlob, onRecordingComplete]);

  const discardRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingState({ isRecording: false, duration: 0 });
    setIsPlaying(false);
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Audio element event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioUrl]);

  return (
    <Card className={cn('p-4', className)}>
      <div className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4">
          {!recordingState.isRecording && !audioBlob && (
            <Button
              onClick={startRecording}
              disabled={disabled}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Mic className="w-5 h-5 mr-2" />
              Start Recording
            </Button>
          )}

          {recordingState.isRecording && (
            <Button
              onClick={stopRecording}
              size="lg"
              variant="destructive"
            >
              <Square className="w-5 h-5 mr-2" />
              Stop Recording
            </Button>
          )}
        </div>

        {/* Recording Status */}
        {recordingState.isRecording && (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>
            <div className="text-2xl font-mono">
              {formatTime(recordingState.duration)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Max: {formatTime(maxDuration)}
            </div>
          </div>
        )}

        {/* Playback Controls */}
        {audioBlob && audioUrl && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">
                Recording completed ({formatTime(recordingState.duration)})
              </div>
              
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Button
                  onClick={playRecording}
                  variant="outline"
                  size="sm"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
              </div>

              <audio
                ref={audioRef}
                src={audioUrl}
                className="w-full"
                controls
              />
            </div>

            {/* Save/Discard Actions */}
            <div className="flex justify-center space-x-2">
              <Button
                onClick={discardRecording}
                variant="outline"
              >
                Discard
              </Button>
              <Button
                onClick={saveRecording}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Save Recording
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {recordingState.error && (
          <div className="text-center text-red-600 text-sm">
            {recordingState.error}
          </div>
        )}

        {/* Microphone Permission Note */}
        {!recordingState.isRecording && !audioBlob && (
          <div className="text-center text-xs text-gray-500">
            <MicOff className="w-4 h-4 mx-auto mb-1" />
            Microphone access required for voice recording
          </div>
        )}
      </div>
    </Card>
  );
};