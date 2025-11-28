import Report from "../models/Report.js";
import ChatSession from "../models/ChatSession.js";

export const createReport = async (req, res) => {
  try {
    const { chatSessionId, reason, description } = req.body;
    const reporterId = req.userId;

    if (!chatSessionId || !reason) {
      return res.status(400).json({ message: "Chat session ID and reason are required." });
    }

    // Find the chat session to identify the reported user
    const chatSession = await ChatSession.findById(chatSessionId);
    if (!chatSession) {
      return res.status(404).json({ message: "Chat session not found." });
    }

    // Identify the other participant
    const reportedUserId = chatSession.participants.find(
      (id) => id.toString() !== reporterId
    );

    if (!reportedUserId) {
      return res.status(400).json({ message: "Could not determine the user to report." });
    }

    const report = new Report({
      reporterId,
      reportedUserId,
      chatSessionId,
      reason,
      description
    });

    await report.save();

    res.status(201).json({ message: "Report submitted successfully.", report });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getReports = async (req, res) => {
  try {
    // In a real app, check for admin role here
    const reports = await Report.find()
      .populate('reporterId', 'username email')
      .populate('reportedUserId', 'username email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
