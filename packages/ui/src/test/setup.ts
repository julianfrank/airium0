import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock Web APIs that might be used in components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Web Audio APIs for voice components
Object.defineProperty(window, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: vi.fn(() => Promise.resolve({
        getTracks: () => [{ stop: vi.fn() }]
      }))
    }
  },
  writable: true
});

Object.defineProperty(window, 'MediaRecorder', {
  value: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ondataavailable: null,
    onerror: null,
    onstop: null,
    state: 'inactive'
  })),
  writable: true
});

Object.defineProperty(MediaRecorder, 'isTypeSupported', {
  value: vi.fn(() => true),
  writable: true
});

Object.defineProperty(window, 'FileReader', {
  value: vi.fn(() => ({
    readAsDataURL: vi.fn(),
    onloadend: null,
    result: 'data:audio/webm;base64,SGVsbG8gV29ybGQ='
  })),
  writable: true
});

Object.defineProperty(window, 'Audio', {
  value: vi.fn(() => ({
    play: vi.fn(() => Promise.resolve()),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })),
  writable: true
});

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  },
  writable: true
});