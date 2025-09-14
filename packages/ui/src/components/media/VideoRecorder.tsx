import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Video, VideoOff, Square, Play, Pause, Camera } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import type { VideoRecorderProps, RecordingState } from './types';

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
  onRecordingComplete,
  maxDuration = 300, // 5 minutes default
  className,
  disabled = false
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    duration: 0
  });
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      if (previewRef.current) {
        previewRef.current.srcObject = stream;
      }
      
      streamRef.current = stream;
      setHasPermission(true);
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      setHasPermission(false);
      setRecordingState(prev => ({ 
        ...prev, 
        error: 'Failed to access camera/microphone. Please check permissions.' 
      }));
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || !streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
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
        error: 'Failed to start recording. Please try again.' 
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
    if (videoRef.current && videoUrl) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [videoUrl, isPlaying]);

  const saveRecording = useCallback(() => {
    if (videoBlob) {
      onRecordingComplete(videoBlob);
      // Reset state
      setVideoBlob(null);
      setVideoUrl(null);
      setRecordingState({ isRecording: false, duration: 0 });
      setIsPlaying(false);
    }
  }, [videoBlob, onRecordingComplete]);

  const discardRecording = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoBlob(null);
    setVideoUrl(null);
    setRecordingState({ isRecording: false, duration: 0 });
    setIsPlaying(false);
  }, [videoUrl]);

  // Initialize camera on mount
  useEffect(() => {
    if (hasPermission === null) {
      requestPermissions();
    }
  }, [hasPermission, requestPermissions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoUrl]);

  // Video element event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('ended', handleEnded);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoUrl]);

  if (hasPermission === false) {
    return (
      <Card className={cn('p-6 text-center', className)}>
        <VideoOff className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Camera Access Required
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Please allow camera and microphone access to record videos.
        </p>
        <Button onClick={requestPermissions}>
          <Camera className="w-4 h-4 mr-2" />
          Request Permissions
        </Button>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="space-y-4">
        {/* Video Preview/Playback */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {!videoBlob && (
            <video
              ref={previewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          
          {videoBlob && videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              controls={false}
            />
          )}

          {/* Recording Indicator */}
          {recordingState.isRecording && (
            <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-medium">REC</span>
              <span className="text-sm font-mono">
                {formatTime(recordingState.duration)}
              </span>
            </div>
          )}

          {/* Duration Display for Playback */}
          {videoBlob && !recordingState.isRecording && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              <span className="text-sm">
                {formatTime(recordingState.duration)}
              </span>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4">
          {!recordingState.isRecording && !videoBlob && hasPermission && (
            <Button
              onClick={startRecording}
              disabled={disabled}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Video className="w-5 h-5 mr-2" />
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

          {videoBlob && (
            <Button
              onClick={playRecording}
              variant="outline"
              size="lg"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 mr-2" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
          )}
        </div>

        {/* Recording Info */}
        {recordingState.isRecording && (
          <div className="text-center text-sm text-gray-600">
            Maximum duration: {formatTime(maxDuration)}
          </div>
        )}

        {/* Save/Discard Actions */}
        {videoBlob && (
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
        )}

        {/* Error Display */}
        {recordingState.error && (
          <div className="text-center text-red-600 text-sm">
            {recordingState.error}
          </div>
        )}

        {/* Loading State */}
        {hasPermission === null && (
          <div className="text-center text-gray-500 text-sm">
            <Camera className="w-4 h-4 mx-auto mb-1 animate-pulse" />
            Requesting camera access...
          </div>
        )}
      </div>
    </Card>
  );
};