import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();
//creates a new client based on clientID in .env
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * @route   POST /google
 * @desc    Authenticate user via Google Sign-In token and create a session token
 */
router.post("/google", async (req, res) => {
    try {
        const { token } = req.body;

        //verify google token using google's library
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const email = payload.email;

        //restricts to DLSU accs only
        if (!email.endsWith("@dlsu.edu.ph")) {
            return res.status(403).json({ message: "Access denied: not a DLSU email" });
        }

        //generates session JWT valid for 24hrs
        const sessionToken = jwt.sign(
            { email, name: payload.name, picture: payload.picture },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({ token: sessionToken });
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: "Invalid Google token" });
    }
});

export default router;
