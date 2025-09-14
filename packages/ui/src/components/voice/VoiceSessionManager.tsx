import React, { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { VoiceSession, VoiceSessionConfig } from '@airium/shared';

export interface VoiceSessionManagerProps {
  userId: string;
  defaultConfig?: Partial<VoiceSessionConfig>;
}

export interface VoiceSessionManagerRef {
  createSession: (config?: Partial<VoiceSessionConfig>) => Promise<string>;
  endSession: (sessionId: string) => Promise<void>;
  getSession: (sessionId: string) => Promise<VoiceSession | null>;
  updateSession: (sessionId: string, updates: Partial<VoiceSession>) => Promise<void>;
  getCurrentSession: () => string | null;
}

export const VoiceSessionManager = forwardRef<VoiceSessionManagerRef, VoiceSessionManagerProps>(({
  userId,
  defaultConfig = {}
}, ref) => {
  const currentSessionRef = useRef<string | null>(null);
  const sessionsRef = useRef<Map<string, VoiceSession>>(new Map());

  const defaultSessionConfig: VoiceSessionConfig = {
    audioFormat: 'webm',
    streaming: true,
    language: 'en-US',
    model: 'amazon.nova-sonic-v1:0',
    ...defaultConfig
  };

  const createSession = useCallback(async (config?: Partial<VoiceSessionConfig>): Promise<string> => {
    try {
      const sessionId = generateSessionId();
      const sessionConfig = { ...defaultSessionConfig, ...config };
      
      const session: VoiceSession = {
        PK: `VOICE#${sessionId}`,
        SK: 'METADATA',
        sessionId,
        novaSonicSessionId: '', // Will be set by backend
        connectionId: '', // Will be set by backend
        userId,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        audioFormat: sessionConfig.audioFormat,
        totalDuration: 0,
        messageCount: 0
      };

      // Store session locally
      sessionsRef.current.set(sessionId, session);
      currentSessionRef.current = sessionId;

      console.log('Created voice session:', sessionId, sessionConfig);
      
      return sessionId;
    } catch (error) {
      console.error('Failed to create voice session:', error);
      throw new Error('Failed to create voice session');
    }
  }, [userId, defaultSessionConfig]);

  const endSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const session = sessionsRef.current.get(sessionId);
      if (!session) {
        console.warn('Session not found:', sessionId);
        return;
      }

      // Update session status
      const updatedSession: VoiceSession = {
        ...session,
        status: 'COMPLETED',
        updatedAt: new Date().toISOString()
      };

      sessionsRef.current.set(sessionId, updatedSession);

      // Clear current session if it matches
      if (currentSessionRef.current === sessionId) {
        currentSessionRef.current = null;
      }

      console.log('Ended voice session:', sessionId);
    } catch (error) {
      console.error('Failed to end voice session:', error);
      throw new Error('Failed to end voice session');
    }
  }, []);

  const getSession = useCallback(async (sessionId: string): Promise<VoiceSession | null> => {
    return sessionsRef.current.get(sessionId) || null;
  }, []);

  const updateSession = useCallback(async (sessionId: string, updates: Partial<VoiceSession>): Promise<void> => {
    try {
      const session = sessionsRef.current.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const updatedSession: VoiceSession = {
        ...session,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      sessionsRef.current.set(sessionId, updatedSession);
      console.log('Updated voice session:', sessionId, updates);
    } catch (error) {
      console.error('Failed to update voice session:', error);
      throw error;
    }
  }, []);

  const getCurrentSession = useCallback((): string | null => {
    return currentSessionRef.current;
  }, []);

  // Generate unique session ID
  const generateSessionId = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `voice_${timestamp}_${random}`;
  };

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    createSession,
    endSession,
    getSession,
    updateSession,
    getCurrentSession
  }), [createSession, endSession, getSession, updateSession, getCurrentSession]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // End any active sessions
      if (currentSessionRef.current) {
        endSession(currentSessionRef.current).catch(console.error);
      }
    };
  }, [endSession]);

  // This component doesn't render anything visible
  return null;
});

VoiceSessionManager.displayName = 'VoiceSessionManager';

export default VoiceSessionManager;