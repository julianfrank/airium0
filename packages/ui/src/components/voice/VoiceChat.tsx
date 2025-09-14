import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../../lib/use-websocket';
import { useVoiceSessionSubscription } from '../../lib/use-appsync-subscriptions';
import { VoiceSessionEvents } from '../appsync/EventSubscriptions';
import { AudioStreamer } from './AudioStreamer';
import { VoiceSessionManager } from './VoiceSessionManager';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ErrorBoundary } from '../error/ErrorBoundary';
import { useErrorHandler } from '../error/useErrorHandler';
import { ErrorMessage } from '../error/ErrorMessage';
import type { VoiceSession, VoiceSessionConfig } from '@airium/shared';

export interface VoiceChatProps {
  userId: string;
  onTranscription?: (text: string) => void;
  onAIResponse?: (response: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export interface VoiceChatState {
  isRecording: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  currentSessionId: string | null;
  transcription: string;
  aiResponse: string;
  error: string | null;
}

function VoiceChatInner({
  userId,
  onTranscription,
  onAIResponse,
  onError,
  className = ''
}: VoiceChatProps) {
  const [state, setState] = useState<VoiceChatState>({
    isRecording: false,
    isProcessing: false,
    isConnected: false,
    currentSessionId: null,
    transcription: '',
    aiResponse: '',
    error: null
  });

  const { handleError, clearError: clearHandlerError, wrapAsync } = useErrorHandler({
    onError: (error) => {
      setState(prev => ({ ...prev, error: error.message }));
      onError?.(error.message);
    },
  });

  const audioStreamerRef = useRef<{ startRecording: () => void; stopRecording: () => void } | null>(null);
  const sessionManagerRef = useRef<{ createSession: () => Promise<string>; endSession: (sessionId: string) => Promise<void> } | null>(null);

  // WebSocket connection for real-time communication
  const {
    isConnected: wsConnected,
    sendVoiceMessage,
    startVoiceSession,
    endVoiceSession,
    onMessage
  } = useWebSocket();

  // AppSync subscription for voice session events
  const { data: voiceEvent } = useVoiceSessionSubscription(state.currentSessionId || '');

  // Update connection state
  useEffect(() => {
    setState(prev => ({ ...prev, isConnected: wsConnected }));
  }, [wsConnected]);

  // Handle voice session events from AppSync
  useEffect(() => {
    if (voiceEvent) {
      const { status, data } = voiceEvent.payload;
      
      setState(prev => ({
        ...prev,
        isProcessing: status === 'processing',
        error: status === 'error' ? data?.error || 'Voice processing error' : null
      }));

      // Handle different event types
      switch (status) {
        case 'started':
          console.log('Voice session started:', data);
          break;
        case 'processing':
          console.log('Voice processing:', data);
          break;
        case 'completed':
          if (data?.transcription) {
            setState(prev => ({ ...prev, transcription: data.transcription }));
            onTranscription?.(data.transcription);
          }
          if (data?.aiResponse) {
            setState(prev => ({ ...prev, aiResponse: data.aiResponse }));
            onAIResponse?.(data.aiResponse);
          }
          break;
        case 'error':
          const errorMsg = data?.error || 'Voice processing failed';
          setState(prev => ({ ...prev, error: errorMsg }));
          onError?.(errorMsg);
          break;
      }
    }
  }, [voiceEvent, onTranscription, onAIResponse, onError]);

  // Handle WebSocket messages
  useEffect(() => {
    const unsubscribe = onMessage('voice_response', (message) => {
      const { data } = message;
      
      if (data?.audioResponse) {
        // Play audio response
        playAudioResponse(data.audioResponse);
      }
      
      if (data?.transcription) {
        setState(prev => ({ ...prev, transcription: data.transcription }));
        onTranscription?.(data.transcription);
      }
      
      if (data?.aiResponse) {
        setState(prev => ({ ...prev, aiResponse: data.aiResponse }));
        onAIResponse?.(data.aiResponse);
      }
    });

    return unsubscribe;
  }, [onMessage, onTranscription, onAIResponse]);

  // Audio streaming handlers
  const handleAudioData = useCallback((audioData: string) => {
    if (state.currentSessionId && wsConnected) {
      sendVoiceMessage(audioData, state.currentSessionId);
    }
  }, [state.currentSessionId, wsConnected, sendVoiceMessage]);

  const handleRecordingStart = useCallback(
    wrapAsync(async () => {
      // Create new voice session
      const sessionId = await sessionManagerRef.current?.createSession();
      if (!sessionId) {
        throw new Error('Failed to create voice session');
      }

      setState(prev => ({
        ...prev,
        isRecording: true,
        currentSessionId: sessionId,
        error: null,
        transcription: '',
        aiResponse: ''
      }));

      // Start WebSocket voice session
      startVoiceSession();
    }),
    [startVoiceSession, wrapAsync]
  );

  const handleRecordingStop = useCallback(
    wrapAsync(async () => {
      setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

      // End WebSocket voice session
      if (state.currentSessionId) {
        endVoiceSession(state.currentSessionId);
        await sessionManagerRef.current?.endSession(state.currentSessionId);
      }
    }),
    [state.currentSessionId, endVoiceSession, wrapAsync]
  );

  const handleStartRecording = useCallback(() => {
    audioStreamerRef.current?.startRecording();
    handleRecordingStart();
  }, [handleRecordingStart]);

  const handleStopRecording = useCallback(() => {
    audioStreamerRef.current?.stopRecording();
    handleRecordingStop();
  }, [handleRecordingStop]);

  const playAudioResponse = useCallback((audioData: string) => {
    try {
      // Convert base64 audio data to blob and play
      const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], {
        type: 'audio/webm'
      });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.play().catch(error => {
        console.error('Failed to play audio response:', error);
      });
      
      // Clean up URL after playing
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });
    } catch (error) {
      console.error('Failed to process audio response:', error);
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    clearHandlerError();
  }, [clearHandlerError]);

  return (
    <div className={`voice-chat ${className}`}>
      <Card className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Voice Chat</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                state.isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {state.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Error Display */}
          {state.error && (
            <ErrorMessage
              error={state.error}
              title="Voice Chat Error"
              onRetry={() => {
                clearError();
                if (!state.isRecording && !state.isProcessing) {
                  handleStartRecording();
                }
              }}
              onDismiss={clearError}
              showRetry={!state.isRecording && !state.isProcessing}
            />
          )}

          {/* Recording Controls */}
          <div className="flex justify-center">
            {!state.isRecording ? (
              <Button
                onClick={handleStartRecording}
                disabled={!state.isConnected || state.isProcessing}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full"
              >
                {state.isProcessing ? 'Processing...' : '🎤 Start Recording'}
              </Button>
            ) : (
              <Button
                onClick={handleStopRecording}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full animate-pulse"
              >
                ⏹️ Stop Recording
              </Button>
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex justify-center gap-4 text-sm text-gray-600">
            {state.isRecording && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording...
              </div>
            )}
            {state.isProcessing && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Processing...
              </div>
            )}
          </div>

          {/* Transcription Display */}
          {state.transcription && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-1">You said:</h3>
              <p className="text-sm text-blue-700">{state.transcription}</p>
            </div>
          )}

          {/* AI Response Display */}
          {state.aiResponse && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-sm font-medium text-green-800 mb-1">AI Response:</h3>
              <p className="text-sm text-green-700">{state.aiResponse}</p>
            </div>
          )}

          {/* Voice Session Events */}
          {state.currentSessionId && (
            <VoiceSessionEvents
              sessionId={state.currentSessionId}
              onStatusChange={(status, data) => {
                console.log('Voice session status:', status, data);
              }}
              className="mt-4"
            />
          )}
        </div>
      </Card>

      {/* Hidden Components */}
      <AudioStreamer
        ref={audioStreamerRef}
        onAudioData={handleAudioData}
        onError={(error) => {
          setState(prev => ({ ...prev, error }));
          onError?.(error);
        }}
      />

      <VoiceSessionManager
        ref={sessionManagerRef}
        userId={userId}
      />
    </div>
  );
}

// Export wrapped component with error boundary
export function VoiceChat(props: VoiceChatProps) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="p-6">
          <ErrorMessage
            error="Voice chat component failed to load"
            title="Voice Chat Error"
            onRetry={() => window.location.reload()}
            showDetails={true}
          />
        </Card>
      }
      onError={(error, errorInfo) => {
        console.error('VoiceChat Error Boundary:', error, errorInfo);
        props.onError?.(`Component error: ${error.message}`);
      }}
    >
      <VoiceChatInner {...props} />
    </ErrorBoundary>
  );
}

export default VoiceChat;