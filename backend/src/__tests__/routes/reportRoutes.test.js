import request from 'supertest';
import app from '../../server.js';
import { connectDB, disconnectDB } from '../../utils/testDb.js';
import Report from '../../models/Report.js';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';

describe('Report Routes - Integration Tests', () => {
  let authToken;
  let testReporter;
  let testReportedUser;

  beforeAll(async () => {
    await connectDB();

    // Create test users
    testReporter = await User.create({
      email: 'reporter@dlsu.edu.ph',
      username: 'test_reporter',
      googleId: 'google123',
    });

    testReportedUser = await User.create({
      email: 'reported@dlsu.edu.ph',
      username: 'test_reported',
      googleId: 'google456',
    });

    // Generate auth token
    authToken = jwt.sign(
      { email: testReporter.email, username: testReporter.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up
    await Report.deleteMany({});
    await User.deleteMany({});
    await disconnectDB();
  });

  afterEach(async () => {
    // Clean up reports after each test
    await Report.deleteMany({});
  });

  describe('POST /api/reports', () => {
    it('should successfully submit a report with valid data', async () => {
      const reportData = {
        reportedUserId: testReportedUser.email,
        reason: 'harassment',
        description: 'This user was harassing me during our chat session.',
      };

      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Report submitted successfully');
      expect(response.body.data).toMatchObject({
        reportId: expect.any(String),
        status: 'pending',
        reason: 'harassment',
        reportedUsername: testReportedUser.username,
      });

      // Verify report was saved to database
      const savedReport = await Report.findById(response.body.data.reportId);
      expect(savedReport).toBeTruthy();
      expect(savedReport.reporterId).toBe(testReporter.email);
      expect(savedReport.reportedUserId).toBe(testReportedUser.email);
    });

    it('should reject report without authentication', async () => {
      const reportData = {
        reportedUserId: testReportedUser.email,
        reason: 'spam',
        description: 'This is spam',
      };

      const response = await request(app)
        .post('/api/reports')
        .send(reportData)
        .expect(401);

      expect(response.body.message).toBe('Authentication required');
    });

    it('should reject report with missing required fields', async () => {
      const reportData = {
        reason: 'harassment',
        // Missing reportedUserId and description
      };

      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should reject report with invalid reason', async () => {
      const reportData = {
        reportedUserId: testReportedUser.email,
        reason: 'invalid_reason_type',
        description: 'Test description',
      };

      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid reason');
    });

    it('should reject user trying to report themselves', async () => {
      const reportData = {
        reportedUserId: testReporter.email, // Same as authenticated user
        reason: 'spam',
        description: 'Test description',
      };

      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You cannot report yourself');
    });

    it('should handle all valid reason types', async () => {
      const validReasons = [
        'spam',
        'harassment',
        'inappropriate_content',
        'fake_profile',
        'other',
      ];

      for (const reason of validReasons) {
        const reportData = {
          reportedUserId: testReportedUser.email,
          reason,
          description: `Testing ${reason} reason type`,
        };

        const response = await request(app)
          .post('/api/reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(reportData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reason).toBe(reason);
      }
    });
  });

  describe('GET /api/reports', () => {
    beforeEach(async () => {
      // Create some test reports
      await Report.create([
        {
          reporterId: testReporter.email,
          reporterUsername: testReporter.username,
          reportedUserId: testReportedUser.email,
          reportedUsername: testReportedUser.username,
          reason: 'spam',
          description: 'Spam report 1',
          status: 'pending',
        },
        {
          reporterId: testReporter.email,
          reporterUsername: testReporter.username,
          reportedUserId: testReportedUser.email,
          reportedUsername: testReportedUser.username,
          reason: 'harassment',
          description: 'Harassment report',
          status: 'reviewed',
        },
      ]);
    });

    it('should fetch all reports for authenticated user', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        total: 2,
      });
    });

    it('should filter reports by status', async () => {
      const response = await request(app)
        .get('/api/reports?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toHaveLength(1);
      expect(response.body.data.reports[0].status).toBe('pending');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/reports?limit=1&page=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toHaveLength(1);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        pages: 2,
      });
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/reports').expect(401);

      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('GET /api/reports/my-reports', () => {
    beforeEach(async () => {
      // Create reports by the test user
      await Report.create([
        {
          reporterId: testReporter.email,
          reporterUsername: testReporter.username,
          reportedUserId: testReportedUser.email,
          reportedUsername: testReportedUser.username,
          reason: 'spam',
          description: 'My report 1',
        },
        {
          reporterId: testReporter.email,
          reporterUsername: testReporter.username,
          reportedUserId: testReportedUser.email,
          reportedUsername: testReportedUser.username,
          reason: 'harassment',
          description: 'My report 2',
        },
      ]);
    });

    it('should fetch only current user\'s reports', async () => {
      const response = await request(app)
        .get('/api/reports/my-reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].reporterId).toBe(testReporter.email);
      expect(response.body.data[1].reporterId).toBe(testReporter.email);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/reports/my-reports')
        .expect(401);

      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('GET /api/reports/:id', () => {
    let testReport;

    beforeEach(async () => {
      testReport = await Report.create({
        reporterId: testReporter.email,
        reporterUsername: testReporter.username,
        reportedUserId: testReportedUser.email,
        reportedUsername: testReportedUser.username,
        reason: 'spam',
        description: 'Test report',
      });
    });

    it('should fetch a specific report by ID', async () => {
      const response = await request(app)
        .get(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testReport._id.toString());
      expect(response.body.data.reason).toBe('spam');
    });

    it('should return 404 for non-existent report ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/reports/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Report not found');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get(`/api/reports/${testReport._id}`)
        .expect(401);

      expect(response.body.message).toBe('Authentication required');
    });
  });
});
