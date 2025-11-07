import {
  submitReport,
  getReports,
  getReportById,
  getMyReports,
} from '../../controllers/reportController.js';
import Report from '../../models/Report.js';
import User from '../../models/User.js';
import ChatSession from '../../models/ChatSession.js';

// Mock the models
jest.spyOn(Report.prototype, 'save');
jest.spyOn(Report, 'findById');
jest.spyOn(Report, 'find');
jest.spyOn(Report, 'countDocuments');
jest.spyOn(User, 'findOne');
jest.spyOn(ChatSession, 'findById');

describe('Report Controller - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    console.log = jest.fn(); // Suppress console logs in tests
    console.error = jest.fn();

    // Mock request and response
    req = {
      user: {
        email: 'reporter@dlsu.edu.ph',
        username: 'reporter_user',
      },
      body: {},
      query: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('submitReport', () => {
    it('should successfully submit a report with all required fields', async () => {
      req.body = {
        reportedUserId: 'reported@dlsu.edu.ph',
        reason: 'harassment',
        description: 'This user was harassing me in chat',
        chatSessionId: '507f1f77bcf86cd799439011',
      };

      // Mock User.findOne to return reported user
      User.findOne.mockResolvedValue({
        email: 'reported@dlsu.edu.ph',
        username: 'reported_user',
      });

      // Mock ChatSession.findById
      ChatSession.findById.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        participants: ['reporter@dlsu.edu.ph', 'reported@dlsu.edu.ph'],
      });

      // Mock Report.save
      Report.prototype.save.mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        reporterId: 'reporter@dlsu.edu.ph',
        reporterUsername: 'reporter_user',
        reportedUserId: 'reported@dlsu.edu.ph',
        reportedUsername: 'reported_user',
        reason: 'harassment',
        description: 'This user was harassing me in chat',
        status: 'pending',
        createdAt: new Date(),
      });

      await submitReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Report submitted successfully',
          data: expect.objectContaining({
            reportId: '507f1f77bcf86cd799439012',
            status: 'pending',
            reason: 'harassment',
          }),
        })
      );
    });

    it('should reject report with missing required fields', async () => {
      req.body = {
        reason: 'spam',
        // Missing reportedUserId and description
      };

      await submitReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Missing required fields'),
        })
      );
    });

    it('should reject report with invalid reason', async () => {
      req.body = {
        reportedUserId: 'reported@dlsu.edu.ph',
        reason: 'invalid_reason',
        description: 'Test description',
      };

      await submitReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid reason'),
        })
      );
    });

    it('should reject user trying to report themselves', async () => {
      req.body = {
        reportedUserId: 'reporter@dlsu.edu.ph', // Same as req.user.email
        reason: 'spam',
        description: 'Test description',
      };

      await submitReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'You cannot report yourself',
        })
      );
    });

    it('should return 404 if reported user not found', async () => {
      req.body = {
        reportedUserId: 'nonexistent@dlsu.edu.ph',
        reason: 'spam',
        description: 'Test description',
      };

      User.findOne.mockResolvedValue(null);

      await submitReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Reported user not found',
        })
      );
    });

    it('should handle report submission without chatSessionId', async () => {
      req.body = {
        reportedUserId: 'reported@dlsu.edu.ph',
        reason: 'fake_profile',
        description: 'This is a fake profile',
      };

      User.findOne.mockResolvedValue({
        email: 'reported@dlsu.edu.ph',
        username: 'reported_user',
      });

      Report.prototype.save.mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        reporterId: 'reporter@dlsu.edu.ph',
        reporterUsername: 'reporter_user',
        reportedUserId: 'reported@dlsu.edu.ph',
        reportedUsername: 'reported_user',
        reason: 'fake_profile',
        description: 'This is a fake profile',
        status: 'pending',
        chatSessionId: null,
        createdAt: new Date(),
      });

      await submitReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      req.body = {
        reportedUserId: 'reported@dlsu.edu.ph',
        reason: 'spam',
        description: 'Test description',
      };

      User.findOne.mockRejectedValue(new Error('Database connection error'));

      await submitReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to submit report',
        })
      );
    });
  });

  describe('getReports', () => {
    it('should fetch all reports with pagination', async () => {
      req.query = { limit: '10', page: '1' };

      const mockReports = [
        {
          _id: '507f1f77bcf86cd799439012',
          reporterId: 'user1@dlsu.edu.ph',
          reportedUserId: 'user2@dlsu.edu.ph',
          reason: 'spam',
          status: 'pending',
        },
        {
          _id: '507f1f77bcf86cd799439013',
          reporterId: 'user3@dlsu.edu.ph',
          reportedUserId: 'user4@dlsu.edu.ph',
          reason: 'harassment',
          status: 'pending',
        },
      ];

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue(mockReports),
      };

      Report.find.mockReturnValue(mockFind);
      Report.countDocuments.mockResolvedValue(2);

      await getReports(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            reports: mockReports,
            pagination: expect.objectContaining({
              page: 1,
              limit: 10,
              total: 2,
            }),
          }),
        })
      );
    });

    it('should filter reports by status', async () => {
      req.query = { status: 'pending', limit: '10', page: '1' };

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([]),
      };

      Report.find.mockReturnValue(mockFind);
      Report.countDocuments.mockResolvedValue(0);

      await getReports(req, res);

      expect(Report.find).toHaveBeenCalledWith({ status: 'pending' });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getReportById', () => {
    it('should fetch a specific report by ID', async () => {
      req.params.id = '507f1f77bcf86cd799439012';

      const mockReport = {
        _id: '507f1f77bcf86cd799439012',
        reporterId: 'reporter@dlsu.edu.ph',
        reportedUserId: 'reported@dlsu.edu.ph',
        reason: 'harassment',
        status: 'pending',
      };

      Report.findById.mockResolvedValue(mockReport);

      await getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockReport,
        })
      );
    });

    it('should return 404 if report not found', async () => {
      req.params.id = 'nonexistent123';

      Report.findById.mockResolvedValue(null);

      await getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Report not found',
        })
      );
    });
  });

  describe('getMyReports', () => {
    it('should fetch reports submitted by the current user', async () => {
      const mockReports = [
        {
          _id: '507f1f77bcf86cd799439012',
          reporterId: 'reporter@dlsu.edu.ph',
          reportedUserId: 'user1@dlsu.edu.ph',
          reason: 'spam',
        },
        {
          _id: '507f1f77bcf86cd799439013',
          reporterId: 'reporter@dlsu.edu.ph',
          reportedUserId: 'user2@dlsu.edu.ph',
          reason: 'harassment',
        },
      ];

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockReports),
      };

      Report.find.mockReturnValue(mockFind);

      await getMyReports(req, res);

      expect(Report.find).toHaveBeenCalledWith({
        reporterId: 'reporter@dlsu.edu.ph',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockReports,
        })
      );
    });
  });
});
