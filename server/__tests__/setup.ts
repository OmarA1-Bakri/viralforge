// Test setup and global mocks
import { beforeAll, afterAll, afterEach, jest } from '@jest/globals';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/viralforge_test';

// Global test timeout
jest.setTimeout(10000);

beforeAll(async () => {
  // Setup test database, etc.
});

afterEach(() => {
  // Clear mocks
  jest.clearAllMocks();
});

afterAll(async () => {
  // Cleanup
});
