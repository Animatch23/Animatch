# Quick Test Guide - US #12 Interest-Based Matchmaking

## Running Tests

### Method 1: Using Batch Files (Windows)
```cmd
# Run matchmaking algorithm tests
backend\run-matchmaking-test.bat

# Run queue controller tests
backend\run-queue-interests-test.bat
```

### Method 2: Direct NPM Commands
```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test -- matchmakingAlgorithm.test.js
npm test -- queueControllerInterests.test.js

# Run with watch mode
npm run test:watch

# Run with debug info
npm run test:debug
```

## Manual Testing with MongoDB

### 1. Create Test Profiles with Interests

```javascript
// In MongoDB shell or Compass
db.profiles.insertMany([
  {
    userId: "user1",
    username: "Alice",
    interests: {
      course: "Computer Science",
      dorm: "Dorm A",
      organizations: ["Anime Club", "Gaming Society"]
    }
  },
  {
    userId: "user2",
    username: "Bob",
    interests: {
      course: "Computer Science",
      dorm: "Dorm B",
      organizations: ["Tech Club"]
    }
  },
  {
    userId: "user3",
    username: "Charlie",
    interests: {
      course: "Business",
      dorm: "Dorm C",
      organizations: ["Finance Club"]
    }
  }
]);
```

### 2. Monitor Queue and Matches

```javascript
// Check queue entries
db.queues.find().pretty()

// Check chat sessions with metadata
db.chatsessions.find().pretty()

// Find matches by strategy
db.chatsessions.find({ "metadata.matchingStrategy": "similarity-based" })
db.chatsessions.find({ "metadata.matchingStrategy": "random-fallback" })

// Get average similarity scores
db.chatsessions.aggregate([
  { $group: { 
    _id: "$metadata.matchingStrategy", 
    avgScore: { $avg: "$metadata.similarityScore" },
    count: { $sum: 1 }
  }}
])
```

## Manual Testing via API

### 1. Join Queue (with auth token)
```bash
POST http://localhost:5001/api/queue/join
Headers: 
  Authorization: Bearer <your_jwt_token>

# Check server logs for:
# [joinQueue] User XXX interests: { course: "...", dorm: "...", organizations: [...] }
```

### 2. Check Queue Status
```bash
GET http://localhost:5001/api/queue/check
Headers: 
  Authorization: Bearer <your_jwt_token>

# Check server logs for:
# [findMatch] Best match for XXX is YYY
# [findMatch] Similarity score: N
# [findMatch] Matching strategy: similarity-based | random-fallback
```

### 3. View Chat Session
```bash
# After matching, check the chat session to see metadata
GET http://localhost:5001/api/match/session
Headers: 
  Authorization: Bearer <your_jwt_token>
```

## Expected Log Output

### Successful Similarity-Based Match:
```
[joinQueue] User 507f1f77bcf86cd799439011 attempting to join queue
[joinQueue] User 507f1f77bcf86cd799439011 interests: {
  course: 'Computer Science',
  dorm: 'Dorm A',
  organizations: [ 'Anime Club', 'Gaming Society' ]
}
[joinQueue] User 507f1f77bcf86cd799439011 successfully added to queue
[checkQueueStatus] Checking status for user 507f1f77bcf86cd799439011
[findMatch] Starting match search for user 507f1f77bcf86cd799439011
[findMatch] User 507f1f77bcf86cd799439011 interests: {
  course: 'Computer Science',
  dorm: 'Dorm A',
  organizations: [ 'Anime Club', 'Gaming Society' ]
}
[findMatch] Found 1 potential candidates
[findMatch] Best match for 507f1f77bcf86cd799439011 is 507f191e810c19729de860ea
[findMatch] Similarity score: 6
[findMatch] Matching strategy: similarity-based
[findMatch] Chat session created: 65a1234567890abcdef12345
[findMatch] Users 507f1f77bcf86cd799439011 and 507f191e810c19729de860ea removed from queue
[checkQueueStatus] User 507f1f77bcf86cd799439011 matched successfully
```

### Random Fallback Match:
```
[findMatch] Starting match search for user 507f1f77bcf86cd799439011
[findMatch] User 507f1f77bcf86cd799439011 interests: {
  course: 'Computer Science',
  dorm: 'Dorm A',
  organizations: [ 'Anime Club' ]
}
[findMatch] Found 1 potential candidates
[findMatch] Best match for 507f1f77bcf86cd799439011 is 507f191e810c19729de860ea
[findMatch] Similarity score: 0
[findMatch] Matching strategy: random-fallback
[findMatch] Chat session created: 65a1234567890abcdef12345
```

### No Match Available:
```
[checkQueueStatus] Checking status for user 507f1f77bcf86cd799439011
[findMatch] Starting match search for user 507f1f77bcf86cd799439011
[findMatch] User 507f1f77bcf86cd799439011 interests: {
  course: 'Computer Science',
  dorm: 'Dorm A',
  organizations: []
}
[findMatch] Found 0 potential candidates
[findMatch] No candidates available for user 507f1f77bcf86cd799439011
[checkQueueStatus] User 507f1f77bcf86cd799439011 still waiting - wait time: 5234ms
```

## Test Scenarios to Verify

### Scenario 1: Perfect Match (Score = 6)
- User A: CS, Dorm A, [Anime Club]
- User B: CS, Dorm A, [Anime Club]
- **Expected:** Match with score 6, similarity-based

### Scenario 2: Partial Match (Score = 3)
- User A: CS, Dorm A, [Anime Club]
- User B: CS, Dorm B, [Tech Club]
- **Expected:** Match with score 3, similarity-based

### Scenario 3: No Match (Score = 0)
- User A: CS, Dorm A, [Anime Club]
- User B: Business, Dorm B, [Finance Club]
- **Expected:** Match with score 0, random-fallback

### Scenario 4: Multiple Candidates
- User A: CS, Dorm A, [Anime Club]
- User B: CS, Dorm B, [] (score = 3)
- User C: CS, Dorm A, [] (score = 5)
- User D: Business, Dorm C, [] (score = 0)
- **Expected:** User A matches with User C (highest score)

### Scenario 5: No Interests Set
- User A: null, null, []
- User B: CS, Dorm A, [Anime Club]
- **Expected:** Match with score 0, random-fallback

## Debugging Tips

1. **Enable verbose logging:**
   - All functions already have comprehensive logging
   - Check console output when running server

2. **Check database state:**
   ```javascript
   // See who's in queue
   db.queues.find()
   
   // See recent matches
   db.chatsessions.find().sort({ startedAt: -1 }).limit(5)
   ```

3. **Common issues:**
   - Users not matching: Check if both users are in queue with `status: "waiting"`
   - Wrong matches: Verify interests are stored correctly in queue entries
   - Test failures: Ensure MongoDB Memory Server is installed

## Performance Benchmarks

Expected performance with test setup:
- Similarity score calculation: < 1ms
- Finding best match (10 candidates): < 5ms
- Full matching flow (DB operations): < 100ms

## Test Coverage

Current coverage includes:
- ✓ Similarity score calculations (12 tests)
- ✓ Best match selection (8 tests)
- ✓ Strategy determination (3 tests)
- ✓ Edge cases (4 tests)
- ✓ Queue operations (3 tests)
- ✓ Integration scenarios (2 tests)

**Total: 32+ test cases covering all critical paths**
