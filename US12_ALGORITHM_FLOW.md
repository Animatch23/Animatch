# Interest-Based Matchmaking Algorithm Flow

## High-Level Architecture

```
┌─────────────┐
│   User A    │
│  Joins      │
│   Queue     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Profile.interests → Queue.interests│
│  (course, dorm, organizations)      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────┐
│   User A    │
│  Requests   │
│   Match     │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│   Find all waiting candidates        │
│   (exclude User A, status=waiting)   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│   For each candidate:                │
│   Calculate Similarity Score         │
│   - Course match: +3                 │
│   - Dorm match: +2                   │
│   - Each shared org: +1              │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│   Sort candidates by score (DESC)    │
└──────┬───────────────────────────────┘
       │
       ▼
       ┌────────────────────────┐
       │ Score >= Threshold (1)?│
       └───┬────────────┬───────┘
           │ YES        │ NO
           ▼            ▼
    ┌──────────┐   ┌──────────────┐
    │ Pick     │   │ Pick Random  │
    │ Highest  │   │ Candidate    │
    │ Scoring  │   │              │
    └────┬─────┘   └──────┬───────┘
         │                │
         └────────┬───────┘
                  ▼
         ┌─────────────────┐
         │ Create          │
         │ ChatSession     │
         │ with metadata   │
         └────┬────────────┘
              │
              ▼
         ┌─────────────────┐
         │ Remove both     │
         │ users from      │
         │ queue           │
         └─────────────────┘
```

## Detailed Algorithm Flow

### Step 1: User Joins Queue

```
Input: User ID, Auth Token
↓
Fetch Profile.interests
↓
Store in Queue entry:
{
  userId: "...",
  username: "...",
  joinedAt: Date,
  status: "waiting",
  interests: {
    course: "Computer Science",
    dorm: "Dorm A",
    organizations: ["Anime Club", "Gaming"]
  }
}
```

### Step 2: User Requests Match

```
Input: User ID
↓
Check for active chat session
  ├─ If exists → Return existing session
  └─ If not → Continue
↓
Get user's queue entry with interests
↓
Find all waiting candidates
```

### Step 3: Calculate Similarity Scores

```
User A interests: {
  course: "Computer Science",
  dorm: "Dorm A",
  organizations: ["Anime Club", "Gaming"]
}

Candidates:
┌──────────┬─────────────┬─────────┬───────────────┬───────┐
│ User ID  │ Course      │ Dorm    │ Orgs          │ Score │
├──────────┼─────────────┼─────────┼───────────────┼───────┤
│ User B   │ CS          │ Dorm A  │ [Anime Club]  │ 6     │
│          │ (+3)        │ (+2)    │ (+1)          │       │
├──────────┼─────────────┼─────────┼───────────────┼───────┤
│ User C   │ CS          │ Dorm B  │ [Tech Club]   │ 3     │
│          │ (+3)        │ (0)     │ (0)           │       │
├──────────┼─────────────┼─────────┼───────────────┼───────┤
│ User D   │ Business    │ Dorm C  │ [Finance]     │ 0     │
│          │ (0)         │ (0)     │ (0)           │       │
└──────────┴─────────────┴─────────┴───────────────┴───────┘

Sort by score: [User B (6), User C (3), User D (0)]
```

### Step 4: Select Best Match

```
                Best candidate score >= 1?
                        │
        ┌───────────────┴───────────────┐
        │ YES                           │ NO
        ▼                               ▼
┌────────────────┐              ┌────────────────┐
│ Similarity     │              │ Random         │
│ Based Match    │              │ Fallback       │
│                │              │                │
│ Select User B  │              │ Select         │
│ (score = 6)    │              │ Random from    │
│                │              │ all candidates │
└────────┬───────┘              └────────┬───────┘
         │                               │
         └───────────────┬───────────────┘
                         ▼
                  Create ChatSession
```

### Step 5: Create Match

```
Create ChatSession:
{
  participants: [User A, User B],
  active: true,
  startedAt: Date.now(),
  metadata: {
    matchingStrategy: "similarity-based",  // or "random-fallback"
    similarityScore: 6,
    matchedAt: Date.now()
  }
}
↓
Remove both users from queue
↓
Return chat session to both users
```

## Scoring Examples

### Example 1: Perfect Match
```
User A: {
  course: "Computer Science",
  dorm: "Dorm A",
  organizations: ["Anime Club", "Gaming Society"]
}

User B: {
  course: "Computer Science",      // +3
  dorm: "Dorm A",                   // +2
  organizations: ["Anime Club",     // +1
                   "Gaming Society"] // +1
}

Total Score: 7
Strategy: similarity-based
```

### Example 2: Course Match Only
```
User A: {
  course: "Computer Science",
  dorm: "Dorm A",
  organizations: ["Anime Club"]
}

User B: {
  course: "Computer Science",      // +3
  dorm: "Dorm B",                   // +0
  organizations: ["Tech Club"]      // +0
}

Total Score: 3
Strategy: similarity-based
```

### Example 3: No Match - Fallback
```
User A: {
  course: "Computer Science",
  dorm: "Dorm A",
  organizations: ["Anime Club"]
}

User B: {
  course: "Business",               // +0
  dorm: "Dorm C",                   // +0
  organizations: ["Finance Club"]   // +0
}

Total Score: 0
Strategy: random-fallback
```

### Example 4: Organization Overlap
```
User A: {
  course: "Computer Science",
  dorm: "Dorm A",
  organizations: ["Anime Club", "Gaming", "Tech Club"]
}

User B: {
  course: "Engineering",            // +0
  dorm: "Dorm B",                   // +0
  organizations: ["Anime Club",     // +1
                   "Gaming"]         // +1
}

Total Score: 2
Strategy: similarity-based
```

## Decision Tree

```
                    ┌─────────────┐
                    │ User wants  │
                    │   to match  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
              ┌─────┤ Has active  ├─────┐
              │     │    chat?    │     │
              │     └─────────────┘     │
             YES                        NO
              │                          │
              ▼                          ▼
       ┌─────────────┐          ┌─────────────┐
       │ Return      │          │ Find all    │
       │ existing    │          │ waiting     │
       │ chat        │          │ candidates  │
       └─────────────┘          └──────┬──────┘
                                       │
                                       ▼
                               ┌──────────────┐
                         ┌─────┤ Candidates   ├─────┐
                         │     │  available?  │     │
                         │     └──────────────┘     │
                        YES                        NO
                         │                          │
                         ▼                          ▼
                 ┌──────────────┐          ┌──────────────┐
                 │ Calculate    │          │ Return       │
                 │ similarity   │          │ "waiting"    │
                 │ scores       │          │ status       │
                 └──────┬───────┘          └──────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │ Sort by      │
                 │ score DESC   │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
           ┌─────┤ Best score   ├─────┐
           │     │    >= 1?     │     │
           │     └──────────────┘     │
          YES                        NO
           │                          │
           ▼                          ▼
    ┌──────────────┐          ┌──────────────┐
    │ Select       │          │ Select       │
    │ highest      │          │ random       │
    │ scoring      │          │ candidate    │
    └──────┬───────┘          └──────┬───────┘
           │                          │
           └──────────┬───────────────┘
                      ▼
              ┌──────────────┐
              │ Create       │
              │ ChatSession  │
              │ with metadata│
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │ Remove both  │
              │ from queue   │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │ Return match │
              │ to users     │
              └──────────────┘
```

## Edge Cases Handled

1. **No Profile/Interests:**
   - Uses default: { course: null, dorm: null, organizations: [] }
   - Still participates in matching (via random fallback)

2. **No Candidates:**
   - Returns "waiting" status
   - User stays in queue

3. **Candidate Has Active Chat:**
   - Skips that candidate
   - Removes them from queue
   - Continues matching with others

4. **Multiple Candidates with Same Score:**
   - Takes the first one after sorting
   - Deterministic behavior

5. **User Already Has Active Chat:**
   - Returns existing chat session
   - Doesn't create duplicate

6. **Case Sensitivity:**
   - All comparisons are case-insensitive
   - "Computer Science" = "computer science"

## Performance Characteristics

- **Time Complexity:** O(n) where n = number of candidates
  - One pass to calculate scores
  - One sort operation
  - One selection

- **Space Complexity:** O(n)
  - Stores candidate scores in memory
  - Scales linearly with queue size

- **Database Queries:**
  - 1 query to get user's queue entry
  - 1 query to get all candidates
  - 1 query to check for active chats
  - 1 insert for ChatSession
  - 1 delete for queue cleanup
  - **Total: 5 queries per match attempt**
