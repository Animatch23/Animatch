import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Replace with your actual API URL and tokens
const API_URL = 'http://localhost:3000/api';
const USER_TOKENS = [
  'token_for_user1',
  'token_for_user2',
  'token_for_user3',
  'token_for_user4'
];

// Join queue for a user
async function joinQueue(userIndex) {
  console.log(`User ${userIndex + 1} joining queue...`);
  
  const response = await fetch(`${API_URL}/queue/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${USER_TOKENS[userIndex]}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log(`User ${userIndex + 1} response:`, data);
  return data;
}

// Check queue status for a user
async function checkStatus(userIndex) {
  const response = await fetch(`${API_URL}/queue/status`, {
    headers: {
      'Authorization': `Bearer ${USER_TOKENS[userIndex]}`
    }
  });
  
  const data = await response.json();
  console.log(`User ${userIndex + 1} status:`, data);
  return data;
}

// Test scenario: Join queue with multiple users with time delays
async function testMatchmaking() {
  try {
    // User 1 joins
    await joinQueue(0);
    
    // Check User 1 status (should be in queue)
    await checkStatus(0);
    
    // Wait 2 seconds then User 2 joins
    console.log("Waiting 2 seconds...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // User 2 joins (should get matched with User 1)
    const user2Result = await joinQueue(1);
    
    // Verify User 1 is no longer in queue
    const user1Status = await checkStatus(0);
    
    // Check if matched correctly
    if (user2Result.matched && !user1Status.inQueue) {
      console.log("✅ SUCCESS! Users matched correctly");
    } else {
      console.log("❌ ERROR! Users did not match as expected");
    }
    
  } catch (error) {
    console.error("Test error:", error);
  }
}

// Run the test
testMatchmaking();