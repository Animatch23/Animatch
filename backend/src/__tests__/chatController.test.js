import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../server.js";
import ChatSession from "../models/ChatSession.js";
import Queue from "../models/Queue.js";
import User from "../models/User.js";

describe("Chat Controller - Next Chat Feature", () => {
    let token;
    let userId;
    let otherUserId;
    let chatSessionId;

    beforeAll(async () => {
        process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
        await mongoose.connect(process.env.MONGO_URI_TEST);
        
        // Create test users
        const user = await User.create({
            email: "test1@example.com",
            password: "hashedpassword"
        });
        userId = user._id;

        const otherUser = await User.create({
            email: "test2@example.com",
            password: "hashedpassword"
        });
        otherUserId = otherUser._id;

        // Mock JWT token
    token = jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });
    });

    beforeEach(async () => {
        await ChatSession.deleteMany({});
        await Queue.deleteMany({});

        // Create active chat session
        const session = await ChatSession.create({
            participants: [userId, otherUserId],
            status: "active"
        });
        chatSessionId = session._id;
    });

    afterAll(async () => {
        await User.deleteMany({});
        await ChatSession.deleteMany({});
        await Queue.deleteMany({});
        await mongoose.connection.close();
    });

    describe("POST /api/chat/next", () => {
        it("should end current chat and return to queue", async () => {
            const res = await request(app)
                .post("/api/chat/next")
                .set("Authorization", `Bearer ${token}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain("added back to the queue");
            expect(res.body.data.returnedToQueue).toBe(true);

            // Verify chat session is ended
            const session = await ChatSession.findById(chatSessionId);
            expect(session.status).toBe("skipped");
            expect(session.endReason).toBe("next_chat");
            expect(session.endedBy.toString()).toBe(userId.toString());
            expect(Array.isArray(session.messages)).toBe(true);
            expect(session.messages).toHaveLength(0);

            // Verify users are back in queue
            const queueCount = await Queue.countDocuments({
                userId: { $in: [userId, otherUserId] },
                status: "waiting"
            });
            expect(queueCount).toBe(2);
        });

        it("should return 404 if no active chat exists", async () => {
            await ChatSession.deleteMany({});

            const res = await request(app)
                .post("/api/chat/next")
                .set("Authorization", `Bearer ${token}`)
                .expect(404);

            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("No active chat session");
        });

        it("should not duplicate users in queue", async () => {
            // Add user to queue before calling next chat
            await Queue.create({
                userId: userId,
                status: "waiting"
            });

            await request(app)
                .post("/api/chat/next")
                .set("Authorization", `Bearer ${token}`)
                .expect(200);

            // Should still only have one queue entry per user
            const userQueueCount = await Queue.countDocuments({
                userId: userId,
                status: "waiting"
            });
            expect(userQueueCount).toBe(1);
        });
    });

    describe("GET /api/chat/active", () => {
        it("should return active chat session", async () => {
            const res = await request(app)
                .get("/api/chat/active")
                .set("Authorization", `Bearer ${token}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.sessionId).toBeDefined();
            expect(res.body.data.participants).toHaveLength(2);
        });

        it("should return 404 if no active chat", async () => {
            await ChatSession.deleteMany({});

            const res = await request(app)
                .get("/api/chat/active")
                .set("Authorization", `Bearer ${token}`)
                .expect(404);

            expect(res.body.success).toBe(false);
        });
    });
});