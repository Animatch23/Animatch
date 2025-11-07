# US #12: Interest-Based Matchmaking - Implementation Summary

## Overview
Implemented baseline functionality for interest-based matchmaking that prioritizes similarity over randomness with fallback to random matching when no similar matches are found.

## Changes Made

### 1. Database Schema Updates

#### Profile Model (`backend/src/models/Profile.js`)
- **Added interests fields:**
  - `interests.course` (String): User's course/major (e.g., "Computer Science")
  - `interests.dorm` (String): User's dormitory (e.g., "Dorm A")
  - `interests.organizations` (Array of Strings): User's clubs/organizations

#### Queue Model (`backend/src/models/Queue.js`)
- **Added interests fields:**
  - Same structure as Profile model
  - Stored when user joins queue for quick matching without additional DB queries

#### ChatSession Model (`backend/src/models/ChatSession.js`)
- **Added metadata fields:**
  - `metadata.matchingStrategy`: Tracks if match was similarity-based or random-fallback
  - `metadata.similarityScore`: Numerical score indicating match quality
  - `metadata.matchedAt`: Timestamp of when match was made

### 2. Matchmaking Algorithm (`backend/src/utils/matchmakingAlgorithm.js`)

#### Core Functions:

**`calculateSimilarityScore(userInterests, candidateInterests)`**
- Calculates similarity score between two users
- Scoring system:
  - Same course: +3 points (highest priority)
  - Same dorm: +2 points (medium priority)
  - Each shared organization: +1 point (accumulative)
- Case-insensitive matching
- Handles null/undefined values gracefully

**`findBestMatch(userInterests, candidates, minSimilarityThreshold = 1)`**
- Finds the best match from a list of candidates
- Priority logic:
  1. Calculates scores for all candidates
  2. Sorts by similarity score (descending)
  3. Returns highest-scoring candidate if score >= threshold
  4. Falls back to random selection if no candidate meets threshold
- Returns null if no candidates available

**`getMatchingStrategy(score, threshold = 1)`**
- Returns strategy description for logging/analytics
- Returns 'similarity-based' or 'random-fallback'

### 3. Queue Controller Updates (`backend/src/controllers/queueController.js`)

#### Updated Functions:

**`joinQueue(req, res)`**
- Fetches user's profile to get interests
- Stores interests in queue entry for matching
- Handles cases where profile doesn't exist (uses defaults)
- **Logging:** User ID, interests being stored

**`findMatch(userId)` (Internal)**
- Completely rewritten to use interest-based algorithm
- Fetches user's interests from queue
- Finds all waiting candidates
- Uses `findBestMatch()` to select best candidate
- Calculates similarity score and determines strategy
- Stores matching metadata in ChatSession
- **Logging:** 
  - Match search initiation
  - User interests
  - Candidate count
  - Best match selection
  - Similarity score and strategy
  - Chat session creation

**`checkQueueStatus(req, res)`**
- Enhanced logging for better debugging
- **Logging:** User status checks, match results, wait times

**`queueStatus(req, res)` & `leaveQueue(req, res)`**
- Added comprehensive logging for all operations

### 4. Unit Tests

#### Matchmaking Algorithm Tests (`backend/src/__tests__/matchmakingAlgorithm.test.js`)
- **27 tests total** - All passing ✓
- Coverage includes:
  - Similarity score calculations (various combinations)
  - Case-insensitive matching
  - Null/undefined handling
  - Best match selection logic
  - Threshold-based decision making
  - Random fallback scenarios
  - Edge cases (empty arrays, large datasets, special characters, unicode)

#### Queue Controller Tests (`backend/src/__tests__/queueControllerInterests.test.js`)
- Comprehensive integration tests:
  - Joining queue with interests
  - Matching users with similar interests
  - Fallback to random when no similarities
  - Metadata storage in chat sessions
  - Preventing duplicate matches
  - Handling multiple concurrent users
  - Edge cases (identical interests, no matches available)

### 5. Logging Implementation

All log statements follow the format: `[functionName] Message`

**Key logging points:**
1. **Queue Operations:**
   - User joining queue (with interests)
   - User leaving queue
   - Queue status checks

2. **Matching Process:**
   - Match search initiation
   - User interests being matched
   - Number of candidates found
   - Best match selection with score
   - Matching strategy used
   - Chat session creation
   - Users removed from queue

3. **Error Handling:**
   - Unauthorized access attempts
   - Database errors
   - Missing data scenarios

## Acceptance Criteria Met

✅ **Matchmaking prioritizes similarity > randomness**
- Algorithm calculates similarity scores for all candidates
- Selects highest-scoring candidate first
- Only falls back to random if no candidate meets threshold (score < 1)

✅ **Must fall back to random if no match found**
- When similarity scores are all 0 (no common interests)
- Random selection from available candidates ensures matching still occurs
- Logged as 'random-fallback' strategy

## Mocked Features (For Sprint 2 Integration)

1. **Profile Setup UI** - Currently interests are stored in DB but not yet editable via UI
2. **Interest Selection Interface** - Will be added in profile-setup page
3. **Match Results Display** - Could show similarity score/shared interests to users
4. **Analytics Dashboard** - Could track matching strategies and success rates

## Testing

### Run Tests:
```bash
# Matchmaking Algorithm Tests (27 tests)
cd backend
npm test -- matchmakingAlgorithm.test.js

# Queue Controller Tests
npm test -- queueControllerInterests.test.js

# All Tests
npm test
```

### Test Results:
- ✓ All 27 matchmaking algorithm tests passing
- ✓ Comprehensive coverage of edge cases
- ✓ Integration tests for queue controller

## Example Usage Flow

1. **User A joins queue:**
   - Profile has: course="Computer Science", dorm="Dorm A", orgs=["Anime Club"]
   - Interests stored in queue entry

2. **User B joins queue:**
   - Profile has: course="Computer Science", dorm="Dorm B", orgs=["Gaming Society"]
   - Interests stored in queue entry

3. **User C joins queue:**
   - Profile has: course="Business", dorm="Dorm C", orgs=["Finance Club"]
   - Interests stored in queue entry

4. **User A checks for match:**
   - Algorithm evaluates:
     - User B: Score = 3 (same course)
     - User C: Score = 0 (no matches)
   - **Result:** Matched with User B (similarity-based)
   - ChatSession created with metadata showing score=3, strategy="similarity-based"

5. **User C checks for match (alone in queue):**
   - No candidates available
   - **Result:** Continues waiting

## Database Schema Examples

### Profile with Interests:
```javascript
{
  userId: "507f1f77bcf86cd799439011",
  username: "john_doe",
  pictureUrl: "/uploads/profiles/user123.jpg",
  isBlurred: true,
  interests: {
    course: "Computer Science",
    dorm: "Dorm A",
    organizations: ["Anime Club", "Gaming Society", "Tech Club"]
  }
}
```

### Queue Entry:
```javascript
{
  userId: "507f1f77bcf86cd799439011",
  username: "john_doe",
  joinedAt: ISODate("2025-11-08T10:30:00Z"),
  status: "waiting",
  interests: {
    course: "Computer Science",
    dorm: "Dorm A",
    organizations: ["Anime Club", "Gaming Society"]
  }
}
```

### ChatSession with Metadata:
```javascript
{
  participants: [
    ObjectId("507f1f77bcf86cd799439011"),
    ObjectId("507f191e810c19729de860ea")
  ],
  active: true,
  startedAt: ISODate("2025-11-08T10:35:00Z"),
  metadata: {
    matchingStrategy: "similarity-based",
    similarityScore: 6,
    matchedAt: ISODate("2025-11-08T10:35:00Z")
  }
}
```

## Next Steps for Sprint 2

1. **UI Integration:**
   - Add interests selection in profile-setup page
   - Create interests editing interface in profile page
   - Display shared interests on match screen

2. **Enhanced Matching:**
   - Add weighted preferences (let users prioritize course vs. dorm vs. orgs)
   - Consider adding more interest categories
   - Implement match history and preferences learning

3. **Analytics:**
   - Track matching strategy effectiveness
   - Monitor similarity score distributions
   - Measure user satisfaction by match type

4. **Testing:**
   - E2E tests for complete matching flow
   - Performance testing with large user pools
   - A/B testing for optimal threshold values

## Files Modified/Created

### Created:
- `backend/src/utils/matchmakingAlgorithm.js`
- `backend/src/__tests__/matchmakingAlgorithm.test.js`
- `backend/src/__tests__/queueControllerInterests.test.js`
- `backend/run-matchmaking-test.bat` (test helper)
- `backend/run-queue-interests-test.bat` (test helper)

### Modified:
- `backend/src/models/Profile.js` (added interests fields)
- `backend/src/models/Queue.js` (added interests fields)
- `backend/src/models/ChatSession.js` (added metadata fields)
- `backend/src/controllers/queueController.js` (complete rewrite of matching logic + logging)

## Notes

- All existing functionality remains intact (backward compatible)
- Interests are optional - users without interests still match (random)
- Algorithm is configurable via threshold parameter
- Comprehensive logging for debugging and monitoring
- All tests are independent and can run in isolation
