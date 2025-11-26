import { jest } from '@jest/globals';
import { authMiddleware } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';

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

  test('should return 401 if no token is provided', () => {
    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should return 401 if authorization header is malformed', () => {
    mockReq.headers.authorization = 'InvalidHeader';

    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should return 403 if token is invalid', () => {
    mockReq.headers.authorization = 'Bearer invalid-token';
    jwt.verify = jest.fn().mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should call next() if token is valid', () => {
    const mockDecoded = { email: 'test@dlsu.edu.ph', name: 'Test User' };
    mockReq.headers.authorization = 'Bearer valid-token';
    jwt.verify = jest.fn().mockReturnValue(mockDecoded);

    authMiddleware(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    expect(mockReq.user).toEqual(mockDecoded);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});