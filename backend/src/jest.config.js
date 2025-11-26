export default {
  testEnvironment: 'node',
  verbose: true,
  testTimeout: 30000,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/src/testSetup.js'],
  globalTeardown: '<rootDir>/src/globalTeardown.js',
  transform: {},
  // Detect open handles to help identify leaks
  detectOpenHandles: false, // Set to true for debugging
  // Force sequential test execution to avoid race conditions
  maxWorkers: 1,
};