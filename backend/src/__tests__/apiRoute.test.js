import { jest, beforeAll, beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Create mock User before any imports
const mockUserFindById = jest.fn();
const mockUser = {
  findById: mockUserFindById,
};

// Mock the User module
jest.unstable_mockModule('../models/User.js', () => ({
  default: mockUser,
}));

describe('Auth Middleware Unit Tests', () => {
  let authMiddleware;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeAll(async () => {
    // Import middleware AFTER mocking
    const middlewareModule = await import('../middleware/authMiddleware.js');
    authMiddleware = middlewareModule.default;
  });

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    
    // Clear all mock calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset mock implementations
    mockUserFindById.mockReset();
  });

  it('should call next() if valid token and user exists', async () => {
    const mockUserId = '507f1f77bcf86cd799439011';
    const token = jwt.sign({ id: mockUserId }, process.env.JWT_SECRET || 'test-secret');
    
    mockReq.headers.authorization = `Bearer ${token}`;
    mockUserFindById.mockResolvedValue({ 
      _id: mockUserId, 
      email: 'test@test.com' 
    });

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockUserFindById).toHaveBeenCalledWith(mockUserId);
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.userId).toBe(mockUserId);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 401 if no token provided', async () => {
    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', async () => {
    mockReq.headers.authorization = 'Bearer invalidtoken';

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if user not found', async () => {
    const mockUserId = '507f1f77bcf86cd799439011';
    const token = jwt.sign({ id: mockUserId }, process.env.JWT_SECRET || 'test-secret');
    
    mockReq.headers.authorization = `Bearer ${token}`;
    mockUserFindById.mockResolvedValue(null);

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockUserFindById).toHaveBeenCalledWith(mockUserId);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});