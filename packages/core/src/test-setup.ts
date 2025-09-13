// Test setup file for Vitest
// Add any global test configuration here
import { vi } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  error: vi.fn(),
};

// Set up environment variables for tests
process.env.AWS_REGION = 'us-east-1';
process.env.USER_POOL_ID = 'us-east-1_test123';
process.env.IDENTITY_POOL_ID = 'us-east-1:test-identity-pool-id';
process.env.APPLICATIONS_TABLE = 'test-applications-table';
process.env.GROUPS_TABLE = 'test-groups-table';