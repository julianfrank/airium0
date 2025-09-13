import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppSyncEventsService } from '../services/appsync-events.service';

// Mock AWS SDK
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ StatusCode: 200 }),
  })),
  InvokeCommand: vi.fn(),
}));

describe('AppSyncEventsService', () => {
  let service: AppSyncEventsService;

  beforeEach(() => {
    service = new AppSyncEventsService('test-function-name', 'us-east-1');
  });

  it('should publish UI control event', async () => {
    await expect(
      service.publishUIControlEvent('user123', 'show', 'notes-panel', { noteId: 'note1' })
    ).resolves.not.toThrow();
  });

  it('should publish notes event', async () => {
    await expect(
      service.publishNotesEvent('user123', 'note1', 'create', { content: 'Test note' })
    ).resolves.not.toThrow();
  });

  it('should publish voice session event', async () => {
    await expect(
      service.publishVoiceSessionEvent('session123', 'started', { audioFormat: 'wav' })
    ).resolves.not.toThrow();
  });

  it('should publish chat event', async () => {
    await expect(
      service.publishChatEvent('user123', { text: 'Hello world', type: 'text' })
    ).resolves.not.toThrow();
  });

  it('should publish general event', async () => {
    await expect(
      service.publishEvent('custom_event', { data: 'test' }, 'connection123')
    ).resolves.not.toThrow();
  });
});