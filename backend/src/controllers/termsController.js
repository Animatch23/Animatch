import User from "../models/userModel.js";

// Update user's terms acceptance status
export const acceptTerms = async (req, res) => {
  try {
    const { userId, version } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        termsAccepted: true,
        termsAcceptedDate: new Date(),
        termsAcceptedVersion: version || "1.0"
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json({
      success: true,
      message: "Terms and conditions accepted",
      termsStatus: {
        accepted: updatedUser.termsAccepted,
        date: updatedUser.termsAcceptedDate,
        version: updatedUser.termsAcceptedVersion
      }
    });
    
  } catch (error) {
    console.error("Error accepting terms:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Check user's terms acceptance status
export const getTermsStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json({
      termsAccepted: user.termsAccepted,
      termsAcceptedDate: user.termsAcceptedDate,
      termsAcceptedVersion: user.termsAcceptedVersion
    });
    
  } catch (error) {
    console.error("Error getting terms status:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};