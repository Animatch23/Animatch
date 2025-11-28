import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock the userHelpers module before importing authMiddleware
const mockEnsureUserRecord = jest.fn();
jest.unstable_mockModule('../utils/userHelpers.js', () => ({
  ensureUserRecord: mockEnsureUserRecord
}));

// Import authMiddleware after mocking
const { authMiddleware } = await import('../middleware/authMiddleware.js');

describe('Auth Middleware Unit Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  test('should return 401 if no token is provided', async () => {
    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should return 401 if authorization header is malformed', async () => {
    mockReq.headers.authorization = 'InvalidHeader';

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should return 403 if token is invalid', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReq.headers.authorization = 'Bearer invalid-token';
    jwt.verify = jest.fn().mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(mockNext).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('should call next() if token is valid', async () => {
    const mockDecoded = { email: 'test@dlsu.edu.ph', name: 'Test User' };
    const mockUser = { 
      _id: { toString: () => 'mock-user-id' }, 
      email: 'test@dlsu.edu.ph', 
      username: 'Test User' 
    };
    
    mockReq.headers.authorization = 'Bearer valid-token';
    jwt.verify = jest.fn().mockReturnValue(mockDecoded);
    mockEnsureUserRecord.mockResolvedValue(mockUser);

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    expect(mockReq.userId).toEqual('mock-user-id');
    expect(mockReq.userEmail).toEqual('test@dlsu.edu.ph');
    expect(mockReq.user).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});