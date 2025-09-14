import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  state: string = 'inactive';
  
  constructor(stream: MediaStream, options?: any) {}
  
  start = vi.fn(() => {
    this.state = 'recording';
  });
  
  stop = vi.fn(() => {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  });
}

global.MediaRecorder = MockMediaRecorder as any;

// Mock getUserMedia
const mockGetUserMedia = vi.fn();
global.navigator.mediaDevices = {
  getUserMedia: mockGetUserMedia
} as any;

// Setup default mock behavior
mockGetUserMedia.mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }]
});

// Mock File constructor
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  
  constructor(chunks: any[], filename: string, options: any = {}) {
    this.name = filename;
    this.size = options.size || 0;
    this.type = options.type || '';
  }
} as any;