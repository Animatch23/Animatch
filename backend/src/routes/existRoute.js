import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "email required" });
        } 
        
        const user = await User.findOne({ email });
        
        // Check if user exists and has completed profile setup (has course set in interests)
        const hasProfile = !!(user && user.interests && user.interests.course);
        const exists = !!user; // Keep original meaning of "account exists"
        
        let userWithInterests = null;
        if (user) {
            userWithInterests = {
                _id: user._id,
                email: user.email,
                username: user.username,
                profilePicture: user.profilePicture,
                termsAccepted: user.termsAccepted,
                interests: user.interests || {}
            };
        }
        
        // If the frontend relies on 'exists' to determine if it should redirect to /match or /terms,
        // we should probably return 'exists' as true ONLY if the profile is set up.
        // However, the frontend code I read says:
        // if (exists) -> /match
        // else -> /terms
        
        // If I return exists=true for a user with NO profile, they go to /match with empty profile.
        // This might be bad.
        
        // The user request said: "It should return true if the User document has a nickname (or interests) set. It should return false if those fields are missing."
        // This implies I should override the 'exists' flag.
        
        res.json({ 
            exists: hasProfile, // Use the profile completion check as the 'exists' flag for frontend flow
            user: userWithInterests
        });
    } catch (err) {
        console.error("user exists error:", err);
        res.status(500).json({ error: "server error" });
    }
});

export default router;