// Test setup file for Jest
// Add any global test configuration here

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: jest.fn(),
};

// Set up environment variables for tests
process.env.AWS_REGION = 'us-east-1';
process.env.USER_POOL_ID = 'us-east-1_test123';
process.env.IDENTITY_POOL_ID = 'us-east-1:test-identity-pool-id';