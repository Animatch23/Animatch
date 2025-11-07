import express from "express";
import User from "../models/User.js";
import Profile from "../models/Profile.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "email required" });
        } 
        
        const user = await User.findOne({ email });
        const exists = !!user;
        
        // If user exists, also fetch their profile with interests
        let userWithInterests = null;
        if (user) {
            const profile = await Profile.findOne({ userId: user._id.toString() });
            userWithInterests = {
                _id: user._id,
                email: user.email,
                username: user.username,
                profilePicture: user.profilePicture,
                termsAccepted: user.termsAccepted,
                interests: profile?.interests || null
            };
        }
        
        res.json({ 
            exists,
            user: userWithInterests
        });
    } catch (err) {
        console.error("user exists error:", err);
        res.status(500).json({ error: "server error" });
    }
});

export default router;