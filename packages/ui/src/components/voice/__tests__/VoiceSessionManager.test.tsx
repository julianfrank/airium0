import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoiceSessionManager } from '../VoiceSessionManager';

describe('VoiceSessionManager', () => {
  const defaultProps = {
    userId: 'test-user-123'
  };

  let sessionManagerRef: React.RefObject<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionManagerRef = React.createRef();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    expect(sessionManagerRef.current).toBeDefined();
  });

  it('exposes correct methods through ref', () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    expect(sessionManagerRef.current.createSession).toBeDefined();
    expect(sessionManagerRef.current.endSession).toBeDefined();
    expect(sessionManagerRef.current.getSession).toBeDefined();
    expect(sessionManagerRef.current.updateSession).toBeDefined();
    expect(sessionManagerRef.current.getCurrentSession).toBeDefined();
    
    expect(typeof sessionManagerRef.current.createSession).toBe('function');
    expect(typeof sessionManagerRef.current.endSession).toBe('function');
    expect(typeof sessionManagerRef.current.getSession).toBe('function');
    expect(typeof sessionManagerRef.current.updateSession).toBe('function');
    expect(typeof sessionManagerRef.current.getCurrentSession).toBe('function');
  });

  it('creates a new session successfully', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession();
    });

    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    expect(sessionId).toMatch(/^voice_\d+_[a-z0-9]+$/);
  });

  it('creates session with custom config', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    const customConfig = {
      audioFormat: 'mp3',
      language: 'es-ES',
      streaming: false
    };

    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession(customConfig);
    });

    expect(sessionId).toBeDefined();
    
    // Verify session was created with custom config
    let session: any;
    await act(async () => {
      session = await sessionManagerRef.current.getSession(sessionId);
    });

    expect(session.audioFormat).toBe('mp3');
  });

  it('sets current session when creating', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession();
    });

    expect(sessionManagerRef.current.getCurrentSession()).toBe(sessionId);
  });

  it('ends session successfully', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession();
    });

    await act(async () => {
      await sessionManagerRef.current.endSession(sessionId);
    });

    // Verify session status was updated
    let session: any;
    await act(async () => {
      session = await sessionManagerRef.current.getSession(sessionId);
    });

    expect(session.status).toBe('COMPLETED');
  });

  it('clears current session when ending current session', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession();
    });

    expect(sessionManagerRef.current.getCurrentSession()).toBe(sessionId);

    await act(async () => {
      await sessionManagerRef.current.endSession(sessionId);
    });

    expect(sessionManagerRef.current.getCurrentSession()).toBeNull();
  });

  it('handles ending non-existent session gracefully', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    // Should not throw error
    await act(async () => {
      await sessionManagerRef.current.endSession('non-existent-session');
    });
  });

  it('retrieves session successfully', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession();
    });

    let session: any;
    await act(async () => {
      session = await sessionManagerRef.current.getSession(sessionId);
    });

    expect(session).toBeDefined();
    expect(session.sessionId).toBe(sessionId);
    expect(session.userId).toBe('test-user-123');
    expect(session.status).toBe('ACTIVE');
  });

  it('returns null for non-existent session', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    let session: any;
    await act(async () => {
      session = await sessionManagerRef.current.getSession('non-existent');
    });

    expect(session).toBeNull();
  });

  it('updates session successfully', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession();
    });

    const updates = {
      totalDuration: 5000,
      messageCount: 3
    };

    await act(async () => {
      await sessionManagerRef.current.updateSession(sessionId, updates);
    });

    let session: any;
    await act(async () => {
      session = await sessionManagerRef.current.getSession(sessionId);
    });

    expect(session.totalDuration).toBe(5000);
    expect(session.messageCount).toBe(3);
  });

  it('throws error when updating non-existent session', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    await expect(async () => {
      await act(async () => {
        await sessionManagerRef.current.updateSession('non-existent', {});
      });
    }).rejects.toThrow('Session not found: non-existent');
  });

  it('uses default configuration', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession();
    });

    let session: any;
    await act(async () => {
      session = await sessionManagerRef.current.getSession(sessionId);
    });

    expect(session.audioFormat).toBe('webm');
  });

  it('uses custom default configuration', async () => {
    const customDefaults = {
      audioFormat: 'ogg',
      language: 'fr-FR'
    };

    render(
      <VoiceSessionManager 
        ref={sessionManagerRef} 
        {...defaultProps} 
        defaultConfig={customDefaults}
      />
    );
    
    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession();
    });

    let session: any;
    await act(async () => {
      session = await sessionManagerRef.current.getSession(sessionId);
    });

    expect(session.audioFormat).toBe('ogg');
  });

  it('generates unique session IDs', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    const sessionIds: string[] = [];
    
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        const sessionId = await sessionManagerRef.current.createSession();
        sessionIds.push(sessionId);
      });
    }

    // All session IDs should be unique
    const uniqueIds = new Set(sessionIds);
    expect(uniqueIds.size).toBe(sessionIds.length);
  });

  it('creates session with correct structure', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession();
    });

    let session: any;
    await act(async () => {
      session = await sessionManagerRef.current.getSession(sessionId);
    });

    expect(session).toMatchObject({
      PK: `VOICE#${sessionId}`,
      SK: 'METADATA',
      sessionId,
      novaSonicSessionId: '',
      connectionId: '',
      userId: 'test-user-123',
      status: 'ACTIVE',
      audioFormat: 'webm',
      totalDuration: 0,
      messageCount: 0
    });

    expect(session.createdAt).toBeDefined();
    expect(session.updatedAt).toBeDefined();
  });

  it('updates timestamps correctly', async () => {
    render(<VoiceSessionManager ref={sessionManagerRef} {...defaultProps} />);
    
    let sessionId: string;
    await act(async () => {
      sessionId = await sessionManagerRef.current.createSession();
    });

    let originalSession: any;
    await act(async () => {
      originalSession = await sessionManagerRef.current.getSession(sessionId);
    });

    // Wait a bit and update
    vi.advanceTimersByTime(1000);

    await act(async () => {
      await sessionManagerRef.current.updateSession(sessionId, { messageCount: 1 });
    });

    let updatedSession: any;
    await act(async () => {
      updatedSession = await sessionManagerRef.current.getSession(sessionId);
    });

    expect(updatedSession.updatedAt).not.toBe(originalSession.updatedAt);
  });
});