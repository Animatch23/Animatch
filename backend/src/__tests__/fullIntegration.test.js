/**
 * Integration Test for Profile-Based Matchmaking
 * 
 * This script tests the full flow from frontend to backend:
 * 1. Creating profiles with course, housing, organizations
 * 2. Joining the matchmaking queue
 * 3. Verifying profile-based matching
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Queue from '../models/Queue.js';
import ChatSession from '../models/ChatSession.js';
import { joinQueue, checkQueueStatus } from '../controllers/queueController.js';

let mongoServer;

// Mock users with different profile data
const testUsers = [
  {
    email: 'alice@test.com',
    username: 'Alice',
    course: 'Computer Science',
    housing: 'Dorm A',
    organizations: ['Anime Club', 'Gaming Society']
  },
  {
    email: 'bob@test.com',
    username: 'Bob',
    course: 'Computer Science',
    housing: 'Dorm B',
    organizations: ['Tech Club']
  },
  {
    email: 'charlie@test.com',
    username: 'Charlie',
    course: 'Business',
    housing: 'Dorm C',
    organizations: ['Finance Club']
  }
];

const mockRequest = (userId) => ({
  user: { id: userId }
});

const mockResponse = () => {
  const res = {};
  res._statusCode = 200; // Default to 200 OK
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
      // Create user with new schema structure
      const user = new User({
        email: userData.email,
        username: userData.username,
        course: userData.course,
        housing: userData.housing,
        organizations: userData.organizations
      });
      await user.save();
      
      createdUsers.push(user);
      console.log(`  ✓ Created user: ${userData.username} with profile:`, {
        course: user.course,
        housing: user.housing,
        organizations: user.organizations
      });
    }
    
    // Step 2: Users join the matchmaking queue
    console.log('\nStep 2: Users joining matchmaking queue...');
    
    // Alice joins first
    const aliceReq = mockRequest(createdUsers[0]._id);
    const aliceRes = mockResponse();
    await joinQueue(aliceReq, aliceRes);
    expect(aliceRes._statusCode).toBe(200);
    expect(aliceRes._jsonData.matched).toBe(false);
    console.log(`  ✓ Alice joined queue (no matches yet)`);
    
    // Bob joins and should match with Alice immediately (both CS students)
    const bobReq = mockRequest(createdUsers[1]._id);
    const bobRes = mockResponse();
    await joinQueue(bobReq, bobRes);
    expect(bobRes._statusCode).toBe(200);
    expect(bobRes._jsonData.matched).toBe(true);
    expect(bobRes._jsonData.chatSessionId).toBeTruthy();
    console.log(`  ✓ Bob joined queue and matched immediately with Alice`);
    
    // Charlie joins but shouldn't match (different profile)
    const charlieReq = mockRequest(createdUsers[2]._id);
    const charlieRes = mockResponse();
    await joinQueue(charlieReq, charlieRes);
    expect(charlieRes._statusCode).toBe(200);
    expect(charlieRes._jsonData.matched).toBe(false);
    console.log(`  ✓ Charlie joined queue (no similar matches)`);
    
    // Verify queue state: Only Charlie should remain
    const queueEntries = await Queue.find({});
    expect(queueEntries.length).toBe(1);
    expect(queueEntries[0].userId.toString()).toBe(createdUsers[2]._id.toString());
    console.log(`  ✓ Only Charlie remains in queue (Alice and Bob were matched and removed)`);
    
    // Step 3: Verify the match details
    // Step 3: Verify the match details
    console.log('\nStep 3: Verifying match details...');
    const chatSession = await ChatSession.findById(bobRes._jsonData.chatSessionId);
    console.log(`  ✓ Match verified`);
    console.log(`  → Chat session ID: ${chatSession._id}`);
    
    // Step 4: Verify matching logic
    console.log('\nStep 4: Verifying matching logic...');
    const participantIds = chatSession.participants.map(p => p.toString());
    
    // Alice should match with Bob (both CS students) not Charlie (Business student)
    expect(participantIds).toContain(createdUsers[0]._id.toString()); // Alice
    expect(participantIds).toContain(createdUsers[1]._id.toString()); // Bob
    expect(participantIds).not.toContain(createdUsers[2]._id.toString()); // Charlie
    
    console.log(`  ✓ Alice matched with Bob (similar profile: both CS students)`);
    console.log(`  ✓ Alice did NOT match with Charlie (different profile: Business)`);
    
    console.log('\n=== Integration Test Complete! ===\n');
  });
  
  test('Fallback to random when no similar interests', async () => {
    console.log('\n=== Testing Random Fallback ===\n');
    
    // Create two users with completely different profile data
    const user1 = new User({ 
        email: 'user1@test.com', 
        username: 'User1',
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: ['Anime Club']
    });
    await user1.save();
    
    const user2 = new User({ 
        email: 'user2@test.com', 
        username: 'User2',
        course: 'Business',
        housing: 'Dorm B',
        organizations: ['Finance Club']
    });
    await user2.save();
    
    console.log('User1 profile:', { course: user1.course, housing: user1.housing, organizations: user1.organizations });
    console.log('User2 profile:', { course: user2.course, housing: user2.housing, organizations: user2.organizations });
    console.log('(No common profile data)');
    
    // Add user1 to queue with createdAt 31 seconds ago to trigger random fallback
    await Queue.create({ userId: user1._id, status: 'waiting', createdAt: new Date(Date.now() - 31000) });
    // Add user2 to queue
    await Queue.create({ userId: user2._id, status: 'waiting', createdAt: new Date(Date.now() - 1000) });
    
    // User1 checks for match (should use random matching after 30s timeout)
    const req = mockRequest(user1._id);
    const res = mockResponse();
    
    await checkQueueStatus(req, res);
    
    expect(res._jsonData.matched).toBe(true);
    expect(res._jsonData.chatSessionId).toBeTruthy();
    
    const chatSession = await ChatSession.findById(res._jsonData.chatSessionId);
    
    console.log(`\n✓ Users matched despite no common profile data`);
    console.log(`→ Chat session ID: ${chatSession._id}`);
    
    console.log('✓ Fallback matching working correctly\n');
  });
  
  test('Profile data persists after creation', async () => {
    console.log('\n=== Testing Profile Data Persistence ===\n');
    
    // Create user
    const profileData = {
      course: 'Computer Science',
      housing: 'Dorm A',
      organizations: ['Anime Club', 'Gaming Society', 'Tech Club']
    };

    const user = new User({
      email: 'test@test.com',
      username: 'TestUser',
      course: profileData.course,
      housing: profileData.housing,
      organizations: profileData.organizations
    });
    await user.save();
    
    console.log('Created user with profile data:', profileData);
    
    // Fetch user from database
    const fetchedUser = await User.findOne({ email: 'test@test.com' });
    
    console.log('Fetched user profile:', { 
      course: fetchedUser.course, 
      housing: fetchedUser.housing, 
      organizations: fetchedUser.organizations 
    });
    
    // Verify profile data persisted correctly
    expect(fetchedUser.course).toBe(profileData.course);
    expect(fetchedUser.housing).toBe(profileData.housing);
    expect(fetchedUser.organizations).toEqual(expect.arrayContaining(profileData.organizations));
    
    console.log('✓ All profile data persisted correctly\n');
  });
});
