import Report from '../models/Report.js';
import User from '../models/User.js';
import ChatSession from '../models/ChatSession.js';

/**
 * Submit a new report
 * POST /api/reports
 */
export const submitReport = async (req, res) => {
  console.log('[REPORT] ==========================================');
  console.log('[REPORT] New report submission initiated');
  console.log('[REPORT] Reporter:', req.user?.email, `(${req.user?.username})`);
  console.log('[REPORT] Timestamp:', new Date().toISOString());

  try {
    const { reportedUserId, reason, description, chatSessionId } = req.body;

    // Validation
    if (!reportedUserId || !reason || !description) {
      console.log('[REPORT] Validation failed: Missing required fields');
      console.log('[REPORT] ==========================================');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reportedUserId, reason, and description are required',
      });
    }

    // Validate reason enum
    const validReasons = [
      'spam',
      'harassment',
      'inappropriate_content',
      'fake_profile',
      'other',
    ];
    if (!validReasons.includes(reason)) {
      console.log('[REPORT] Validation failed: Invalid reason:', reason);
      console.log('[REPORT] Valid reasons:', validReasons);
      console.log('[REPORT] ==========================================');
      return res.status(400).json({
        success: false,
        message: `Invalid reason. Must be one of: ${validReasons.join(', ')}`,
      });
    }

    // Check if user is trying to report themselves
    if (req.user.email === reportedUserId) {
      console.log('[REPORT] Validation failed: User cannot report themselves');
      console.log('[REPORT] ==========================================');
      return res.status(400).json({
        success: false,
        message: 'You cannot report yourself',
      });
    }

    // Fetch reported user details
    console.log('[REPORT] Fetching reported user details...');
    const reportedUser = await User.findOne({ email: reportedUserId });
    if (!reportedUser) {
      console.log('[REPORT] Error: Reported user not found:', reportedUserId);
      console.log('[REPORT] ==========================================');
      return res.status(404).json({
        success: false,
        message: 'Reported user not found',
      });
    }
    console.log('[REPORT] Reported user found:', reportedUser.username);

    // Verify chat session if provided
    let chatSession = null;
    if (chatSessionId) {
      console.log('[REPORT] Verifying chat session:', chatSessionId);
      chatSession = await ChatSession.findById(chatSessionId);
      if (!chatSession) {
        console.log('[REPORT] Warning: Chat session not found, proceeding without it');
      } else {
        console.log('[REPORT] Chat session verified');
      }
    }

    // Create report
    const report = new Report({
      reporterId: req.user.email,
      reporterUsername: req.user.username,
      reportedUserId: reportedUser.email,
      reportedUsername: reportedUser.username,
      reason,
      description: description.trim(),
      chatSessionId: chatSessionId || null,
      status: 'pending',
    });

    await report.save();
    console.log('[REPORT] Report saved successfully. ID:', report._id);
    console.log('[REPORT] Reason:', reason);
    console.log('[REPORT] Description preview:', description.substring(0, 50) + '...');

    // Mock: Admin notification (would be real in Sprint 2)
    console.log('[REPORT] [MOCK] Sending notification to admin dashboard...');
    console.log('[REPORT] [MOCK] Admin notification would be sent here in Sprint 2');

    // Mock: Do NOT notify reported user (per acceptance criteria)
    console.log('[REPORT] No notification sent to reported user (per requirements)');

    console.log('[REPORT] Report submission completed successfully');
    console.log('[REPORT] ==========================================');

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: {
        reportId: report._id,
        status: report.status,
        createdAt: report.createdAt,
        reason: report.reason,
        reportedUsername: report.reportedUsername,
      },
    });
  } catch (error) {
    console.error('[REPORT] Error submitting report:', error);
    console.log('[REPORT] ==========================================');
    res.status(500).json({
      success: false,
      message: 'Failed to submit report',
      error: error.message,
    });
  }
};

/**
 * Get all reports (Admin dashboard - mocked)
 * GET /api/reports
 */
export const getReports = async (req, res) => {
  console.log('[REPORT] ==========================================');
  console.log('[REPORT] Fetching all reports (admin view)');
  console.log('[REPORT] Requested by:', req.user?.email);
  console.log('[REPORT] Timestamp:', new Date().toISOString());

  try {
    const { status, limit = 50, page = 1 } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
      console.log('[REPORT] Filtering by status:', status);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('[REPORT] Pagination: page', page, 'limit', limit);

    // Fetch reports
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalCount = await Report.countDocuments(query);

    console.log('[REPORT] Found', reports.length, 'reports (total:', totalCount, ')');
    console.log('[REPORT] [MOCK] Admin dashboard would display these reports');
    console.log('[REPORT] ==========================================');

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[REPORT] Error fetching reports:', error);
    console.log('[REPORT] ==========================================');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message,
    });
  }
};

/**
 * Get a specific report by ID
 * GET /api/reports/:id
 */
export const getReportById = async (req, res) => {
  console.log('[REPORT] ==========================================');
  console.log('[REPORT] Fetching report by ID:', req.params.id);
  console.log('[REPORT] Requested by:', req.user?.email);

  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      console.log('[REPORT] Report not found');
      console.log('[REPORT] ==========================================');
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    console.log('[REPORT] Report found');
    console.log('[REPORT] Reporter:', report.reporterUsername);
    console.log('[REPORT] Reported:', report.reportedUsername);
    console.log('[REPORT] Status:', report.status);
    console.log('[REPORT] ==========================================');

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('[REPORT] Error fetching report:', error);
    console.log('[REPORT] ==========================================');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: error.message,
    });
  }
};

/**
 * Get reports submitted by the current user
 * GET /api/reports/my-reports
 */
export const getMyReports = async (req, res) => {
  console.log('[REPORT] ==========================================');
  console.log('[REPORT] Fetching reports by user:', req.user?.email);

  try {
    const reports = await Report.find({ reporterId: req.user.email })
      .sort({ createdAt: -1 })
      .limit(50);

    console.log('[REPORT] Found', reports.length, 'reports by this user');
    console.log('[REPORT] ==========================================');

    res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('[REPORT] Error fetching user reports:', error);
    console.log('[REPORT] ==========================================');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your reports',
      error: error.message,
    });
  }
};
