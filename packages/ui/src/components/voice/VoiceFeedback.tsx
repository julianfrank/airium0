import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';

export interface VoiceFeedbackProps {
  isRecording: boolean;
  isProcessing: boolean;
  transcription?: string;
  aiResponse?: string;
  audioLevel?: number;
  processingTime?: number;
  confidence?: number;
  onClearFeedback?: () => void;
  className?: string;
}

export interface AudioVisualizerProps {
  isActive: boolean;
  audioLevel: number;
  className?: string;
}

export function AudioVisualizer({ isActive, audioLevel, className = '' }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(new Array(20).fill(0));

  useEffect(() => {
    if (!isActive) {
      setBars(new Array(20).fill(0));
      return;
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * audioLevel));
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, audioLevel]);

  return (
    <div className={`audio-visualizer flex items-end justify-center gap-1 h-16 ${className}`}>
      {bars.map((height, index) => (
        <div
          key={index}
          className={`w-2 bg-gradient-to-t transition-all duration-100 ${
            isActive 
              ? 'from-blue-400 to-blue-600' 
              : 'from-gray-200 to-gray-300'
          }`}
          style={{ 
            height: `${Math.max(4, height * 60)}px`,
            opacity: isActive ? 0.8 : 0.3
          }}
        />
      ))}
    </div>
  );
}

export function VoiceFeedback({
  isRecording,
  isProcessing,
  transcription,
  aiResponse,
  audioLevel = 0.5,
  processingTime,
  confidence,
  onClearFeedback,
  className = ''
}: VoiceFeedbackProps) {
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Track recording duration
  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getStatusMessage = (): string => {
    if (isRecording) return 'Listening...';
    if (isProcessing) return 'Processing your voice...';
    if (transcription && !aiResponse) return 'Generating response...';
    if (aiResponse) return 'Response ready';
    return 'Ready to listen';
  };

  const getStatusColor = (): string => {
    if (isRecording) return 'text-red-600';
    if (isProcessing) return 'text-yellow-600';
    if (aiResponse) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className={`voice-feedback ${className}`}>
      <Card className="p-4">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                isRecording ? 'bg-red-500 animate-pulse' :
                isProcessing ? 'bg-yellow-500 animate-pulse' :
                aiResponse ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusMessage()}
              </span>
            </div>
            
            {(transcription || aiResponse) && onClearFeedback && (
              <button
                onClick={onClearFeedback}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Audio Visualizer */}
          <AudioVisualizer 
            isActive={isRecording || isProcessing}
            audioLevel={audioLevel}
          />

          {/* Recording Info */}
          {isRecording && (
            <div className="text-center">
              <div className="text-lg font-mono text-red-600">
                {formatDuration(recordingDuration)}
              </div>
              <div className="text-xs text-gray-500">
                Recording duration
              </div>
            </div>
          )}

          {/* Processing Info */}
          {isProcessing && (
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-2" />
              <div className="text-xs text-gray-500">
                Processing with Nova Sonic...
              </div>
            </div>
          )}

          {/* Transcription Display */}
          {transcription && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-blue-800">You said:</h4>
                {confidence && (
                  <span className="text-xs text-gray-500">
                    Confidence: {Math.round(confidence * 100)}%
                  </span>
                )}
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">{transcription}</p>
              </div>
            </div>
          )}

          {/* AI Response Display */}
          {aiResponse && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-green-800">AI Response:</h4>
                {processingTime && (
                  <span className="text-xs text-gray-500">
                    {processingTime}ms
                  </span>
                )}
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">{aiResponse}</p>
              </div>
            </div>
          )}

          {/* Help Text */}
          {!isRecording && !isProcessing && !transcription && !aiResponse && (
            <div className="text-center text-xs text-gray-500 space-y-1">
              <p>Click the microphone button to start voice chat</p>
              <p>Powered by Amazon Nova Sonic</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default VoiceFeedback;