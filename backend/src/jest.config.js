export default {
  testEnvironment: 'node', // Use node environment to avoid jsdom overhead
  verbose: true,
  testTimeout: 30000,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*Unit.test.js'],
  setupFilesAfterEnv: [
    '<rootDir>/src/testSetup.js',
    '<rootDir>/../jest.setup.js' // Global setup for resource cleanup
  ],
  globalTeardown: '<rootDir>/src/globalTeardown.js',
  transform: {},
  // Run tests sequentially to avoid race conditions with DB
  maxWorkers: 1,
  // Detect open handles in development (disable in CI to avoid hanging)
  detectOpenHandles: false,
};