/**
 * Integration Test for Interest-Based Matchmaking
 * 
 * This script tests the full flow from frontend to backend:
 * 1. Creating profiles with interests
 * 2. Joining the matchmaking queue
 * 3. Verifying interest-based matching
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Queue from '../models/Queue.js';
import ChatSession from '../models/ChatSession.js';
import { joinQueue, checkQueueStatus } from '../controllers/queueController.js';

let mongoServer;

// Mock users with different interests
const testUsers = [
  {
    email: 'alice@test.com',
    username: 'Alice',
    interests: {
      course: 'Computer Science',
      dorm: 'Dorm A',
      organizations: ['Anime Club', 'Gaming Society']
    }
  },
  {
    email: 'bob@test.com',
    username: 'Bob',
    interests: {
      course: 'Computer Science',
      dorm: 'Dorm B',
      organizations: ['Tech Club']
    }
  },
  {
    email: 'charlie@test.com',
    username: 'Charlie',
    interests: {
      course: 'Business',
      dorm: 'Dorm C',
      organizations: ['Finance Club']
    }
  }
];

const mockRequest = (userId) => ({
  user: { id: userId }
});

const mockResponse = () => {
  const res = {};
  res._statusCode = null;
  res._jsonData = null;
  
  res.status = function(code) {
    res._statusCode = code;
    return this;
  };
  
  res.json = function(data) {
    res._jsonData = data;
    return this;
  };
  
  return res;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Profile.deleteMany({});
  await Queue.deleteMany({});
  await ChatSession.deleteMany({});
});

describe('Full Integration: Profile Setup → Matching', () => {
  
  test('Complete flow: Create profiles with interests, join queue, and match based on similarity', async () => {
    console.log('\n=== Starting Full Integration Test ===\n');
    
    // Step 1: Create users and profiles with interests
    console.log('Step 1: Creating users and profiles with interests...');
    const createdUsers = [];
    
    for (const userData of testUsers) {
      // Create user
      const user = new User({
        email: userData.email,
        username: userData.username
      });
      await user.save();
      
      // Create profile with interests
      const profile = new Profile({
        userId: user._id.toString(),
        username: userData.username,
        interests: userData.interests
      });
      await profile.save();
      
      createdUsers.push(user);
      console.log(`  ✓ Created user: ${userData.username} with interests:`, userData.interests);
    }
    
    // Step 2: Users join the matchmaking queue
    console.log('\nStep 2: Users joining matchmaking queue...');
    for (const user of createdUsers) {
      const req = mockRequest(user._id);
      const res = mockResponse();
      
      await joinQueue(req, res);
      
      expect(res._statusCode).toBe(200);
      expect(res._jsonData.matched).toBe(false);
      console.log(`  ✓ ${user.username} joined queue`);
    }
    
    // Verify all users are in queue
    const queueEntries = await Queue.find({});
    expect(queueEntries.length).toBe(3);
    console.log(`  ✓ All 3 users in queue`);
    
    // Step 3: Alice checks for matches
    console.log('\nStep 3: Alice checking for matches...');
    const aliceReq = mockRequest(createdUsers[0]._id);
    const aliceRes = mockResponse();
    
    await checkQueueStatus(aliceReq, aliceRes);
    
    // Alice should match
    expect(aliceRes._jsonData.matched).toBe(true);
    expect(aliceRes._jsonData.chatSession).toBeTruthy();
    
    const chatSession = await ChatSession.findById(aliceRes._jsonData.chatSession._id);
    console.log(`  ✓ Alice matched successfully`);
    console.log(`  → Chat session ID: ${chatSession._id}`);
    console.log(`  → Matching strategy: ${chatSession.metadata.matchingStrategy}`);
    console.log(`  → Similarity score: ${chatSession.metadata.similarityScore}`);
    
    // Step 4: Verify matching logic
    console.log('\nStep 4: Verifying matching logic...');
    const participantIds = chatSession.participants.map(p => p.toString());
    
    // Alice should match with Bob (both CS students) not Charlie (Business student)
    expect(participantIds).toContain(createdUsers[0]._id.toString()); // Alice
    expect(participantIds).toContain(createdUsers[1]._id.toString()); // Bob
    expect(participantIds).not.toContain(createdUsers[2]._id.toString()); // Charlie
    
    console.log(`  ✓ Alice matched with Bob (similar interests: both CS students)`);
    console.log(`  ✓ Alice did NOT match with Charlie (different interests: Business)`);
    
    // Verify it was similarity-based, not random
    expect(chatSession.metadata.matchingStrategy).toBe('similarity-based');
    expect(chatSession.metadata.similarityScore).toBeGreaterThan(0);
    
    console.log(`  ✓ Match used similarity-based strategy (score: ${chatSession.metadata.similarityScore})`);
    
    // Step 5: Verify both users removed from queue
    console.log('\nStep 5: Verifying queue cleanup...');
    const remainingInQueue = await Queue.find({});
    expect(remainingInQueue.length).toBe(1); // Only Charlie should remain
    expect(remainingInQueue[0].userId).toBe(createdUsers[2]._id.toString());
    
    console.log(`  ✓ Matched users removed from queue`);
    console.log(`  ✓ Charlie still waiting in queue (no similar matches)`);
    
    console.log('\n=== Integration Test Complete! ===\n');
  });
  
  test('Fallback to random when no similar interests', async () => {
    console.log('\n=== Testing Random Fallback ===\n');
    
    // Create two users with completely different interests
    const user1 = new User({ email: 'user1@test.com', username: 'User1' });
    await user1.save();
    
    const profile1 = new Profile({
      userId: user1._id.toString(),
      username: 'User1',
      interests: {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: ['Anime Club']
      }
    });
    await profile1.save();
    
    const user2 = new User({ email: 'user2@test.com', username: 'User2' });
    await user2.save();
    
    const profile2 = new Profile({
      userId: user2._id.toString(),
      username: 'User2',
      interests: {
        course: 'Business',
        dorm: 'Dorm B',
        organizations: ['Finance Club']
      }
    });
    await profile2.save();
    
    console.log('User1 interests:', profile1.interests);
    console.log('User2 interests:', profile2.interests);
    console.log('(No common interests)');
    
    // Both join queue
    await joinQueue(mockRequest(user1._id), mockResponse());
    await joinQueue(mockRequest(user2._id), mockResponse());
    
    // User1 checks for match
    const req = mockRequest(user1._id);
    const res = mockResponse();
    
    await checkQueueStatus(req, res);
    
    expect(res._jsonData.matched).toBe(true);
    
    const chatSession = await ChatSession.findById(res._jsonData.chatSession._id);
    
    console.log(`\n✓ Users matched despite no common interests`);
    console.log(`→ Strategy: ${chatSession.metadata.matchingStrategy}`);
    console.log(`→ Score: ${chatSession.metadata.similarityScore}`);
    
    // Should be random fallback with score 0
    expect(chatSession.metadata.matchingStrategy).toBe('random-fallback');
    expect(chatSession.metadata.similarityScore).toBe(0);
    
    console.log('✓ Random fallback working correctly\n');
  });
  
  test('Profile interests persist after creation', async () => {
    console.log('\n=== Testing Interest Persistence ===\n');
    
    // Create user
    const user = new User({
      email: 'test@test.com',
      username: 'TestUser'
    });
    await user.save();
    
    // Create profile with interests
    const originalInterests = {
      course: 'Computer Science',
      dorm: 'Dorm A',
      organizations: ['Anime Club', 'Gaming Society', 'Tech Club']
    };
    
    const profile = new Profile({
      userId: user._id.toString(),
      username: 'TestUser',
      interests: originalInterests
    });
    await profile.save();
    
    console.log('Created profile with interests:', originalInterests);
    
    // Fetch profile from database
    const fetchedProfile = await Profile.findOne({ userId: user._id.toString() });
    
    console.log('Fetched profile interests:', fetchedProfile.interests);
    
    // Verify interests persisted correctly
    expect(fetchedProfile.interests.course).toBe(originalInterests.course);
    expect(fetchedProfile.interests.dorm).toBe(originalInterests.dorm);
    expect(fetchedProfile.interests.organizations).toEqual(originalInterests.organizations);
    
    console.log('✓ All interests persisted correctly\n');
  });
});
