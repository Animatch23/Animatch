import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();

/**
 * @route   POST /google
 * @desc    Authenticate user via Google Sign-In token and create a session token
 */
router.post("/google", async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: "Authorization code is required" });
        }

        // Create a new client for each request with all parameters
        const client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Exchange authorization code for tokens
        const { tokens } = await client.getToken(code);
        
        const idToken = tokens.id_token;

        // Verify google token using google's library
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload.email;

        // Restricts to DLSU accs only
        if (!email.endsWith("@dlsu.edu.ph")) {
            return res.status(403).json({ message: "Access denied: not a DLSU email" });
        }

        // Generates session JWT valid for 24hrs
        const sessionToken = jwt.sign(
            { email, name: payload.name, picture: payload.picture },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({ token: sessionToken });
    } catch (err) {
        console.error("Google authentication error:", err);
        res.status(401).json({ message: "Invalid Google token", error: err.message });
    }
});

export default router;