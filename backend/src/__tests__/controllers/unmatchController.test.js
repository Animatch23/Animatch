import { jest } from '@jest/globals';
import { unmatchUser, getUnmatchHistory } from '../../controllers/unmatchController.js';
import Match from '../../models/Match.js';
import ChatSession from '../../models/ChatSession.js';
import { connectTestDB, disconnectTestDB, clearDatabase } from '../../utils/testDb.js';

describe('Unmatch Controller Tests', () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    describe('unmatchUser', () => {
        it('should successfully unmatch users with an active chat', async () => {
            // Create an active match
            const match = await Match.create({
                user1: {
                    userId: 'user1@dlsu.edu.ph',
                    username: 'testuser1'
                },
                user2: {
                    userId: 'user2@dlsu.edu.ph',
                    username: 'testuser2'
                },
                status: 'active',
                createdAt: new Date()
            });

            // Create a chat session
            const chatSession = await ChatSession.create({
                participants: ['user1@dlsu.edu.ph', 'user2@dlsu.edu.ph'],
                active: true,
                startedAt: new Date()
            });

            const req = {
                user: {
                    email: 'user1@dlsu.edu.ph',
                    username: 'testuser1'
                }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await unmatchUser(req, res);

            // Verify response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Successfully unmatched',
                    data: expect.objectContaining({
                        matchId: match._id,
                        partnerUsername: 'testuser2',
                        notificationSent: true
                    })
                })
            );

            // Verify match was updated
            const updatedMatch = await Match.findById(match._id);
            expect(updatedMatch.status).toBe('unmatched');
            expect(updatedMatch.unmatchedBy).toBe('user1@dlsu.edu.ph');
            expect(updatedMatch.unmatchedAt).toBeDefined();

            // Verify chat session was marked as unmatched
            const updatedChat = await ChatSession.findById(chatSession._id);
            expect(updatedChat.active).toBe(false);
            expect(updatedChat.unmatched).toBe(true);
            expect(updatedChat.unmatchedBy).toBe('user1@dlsu.edu.ph');
            expect(updatedChat.unmatchedAt).toBeDefined();
            expect(updatedChat.endedAt).toBeDefined();

            // Note: Notification service is called (will log to console in test)
            // In Sprint 2, this will be replaced with real WebSocket notifications
        });

        it('should return 404 if no active match found', async () => {
            const req = {
                user: {
                    email: 'user1@dlsu.edu.ph',
                    username: 'testuser1'
                }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await unmatchUser(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'No active chat session found'
                })
            );

            // Notification service should not be called when there's no match
        });

        it('should handle unmatch when no chat session exists (match only)', async () => {
            // Create match but no chat session
            const match = await Match.create({
                user1: {
                    userId: 'user1@dlsu.edu.ph',
                    username: 'testuser1'
                },
                user2: {
                    userId: 'user2@dlsu.edu.ph',
                    username: 'testuser2'
                },
                status: 'active',
                createdAt: new Date()
            });

            const req = {
                user: {
                    email: 'user1@dlsu.edu.ph',
                    username: 'testuser1'
                }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await unmatchUser(req, res);

            // Should still succeed
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Successfully unmatched'
                })
            );

            // Verify match was updated
            const updatedMatch = await Match.findById(match._id);
            expect(updatedMatch.status).toBe('unmatched');
        });

        it('should work when user2 initiates unmatch', async () => {
            const match = await Match.create({
                user1: {
                    userId: 'user1@dlsu.edu.ph',
                    username: 'testuser1'
                },
                user2: {
                    userId: 'user2@dlsu.edu.ph',
                    username: 'testuser2'
                },
                status: 'active',
                createdAt: new Date()
            });

            const req = {
                user: {
                    email: 'user2@dlsu.edu.ph',
                    username: 'testuser2'
                }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await unmatchUser(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        partnerUsername: 'testuser1'
                    })
                })
            );

            const updatedMatch = await Match.findById(match._id);
            expect(updatedMatch.unmatchedBy).toBe('user2@dlsu.edu.ph');
        });

        it('should handle errors gracefully', async () => {
            // Force an error by passing invalid data (null user data results in 404, not 500)
            const req = {
                user: {
                    email: null,
                    username: null
                }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await unmatchUser(req, res);

            // Expect 404 because null email won't find any matches
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'No active chat session found'
                })
            );
        });
    });

    describe('getUnmatchHistory', () => {
        it('should return unmatch history for a user', async () => {
            // Create some unmatched matches
            await Match.create([
                {
                    user1: { userId: 'user1@dlsu.edu.ph', username: 'testuser1' },
                    user2: { userId: 'user2@dlsu.edu.ph', username: 'testuser2' },
                    status: 'unmatched',
                    unmatchedBy: 'user1@dlsu.edu.ph',
                    unmatchedAt: new Date('2024-01-01')
                },
                {
                    user1: { userId: 'user1@dlsu.edu.ph', username: 'testuser1' },
                    user2: { userId: 'user3@dlsu.edu.ph', username: 'testuser3' },
                    status: 'unmatched',
                    unmatchedBy: 'user3@dlsu.edu.ph',
                    unmatchedAt: new Date('2024-01-02')
                },
                {
                    user1: { userId: 'user4@dlsu.edu.ph', username: 'testuser4' },
                    user2: { userId: 'user5@dlsu.edu.ph', username: 'testuser5' },
                    status: 'unmatched',
                    unmatchedBy: 'user4@dlsu.edu.ph',
                    unmatchedAt: new Date('2024-01-03')
                }
            ]);

            const req = {
                user: {
                    email: 'user1@dlsu.edu.ph',
                    username: 'testuser1'
                }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await getUnmatchHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    count: 2,
                    history: expect.arrayContaining([
                        expect.objectContaining({
                            partnerUsername: 'testuser2',
                            wasInitiator: true
                        }),
                        expect.objectContaining({
                            partnerUsername: 'testuser3',
                            wasInitiator: false
                        })
                    ])
                })
            );
        });

        it('should return empty history if user has no unmatches', async () => {
            const req = {
                user: {
                    email: 'newuser@dlsu.edu.ph',
                    username: 'newuser'
                }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await getUnmatchHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    count: 0,
                    history: []
                })
            );
        });
    });
});
