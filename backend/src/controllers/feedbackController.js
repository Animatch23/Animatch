import Feedback from "../models/Feedback.js";

export const submitFeedback = async (req, res) => {
  try {
    const { chatSessionId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Please provide a rating between 1 and 5" });
    }

    // Attempt to create feedback
    // The unique index in the model prevents duplicate ratings automatically
    await Feedback.create({
      chatSessionId,
      userId,
      rating,
      comment
    });

    res.status(201).json({ message: "Feedback submitted successfully" });

  } catch (error) {
    // Check for duplicate key error (Mongo code 11000)
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already rated this chat" });
    }
    console.error("Feedback error:", error);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
};