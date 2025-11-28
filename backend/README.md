# API
## Accept Terms & Conditions
> Stores user's terms and conditions acceptance.
>> URL: /api/terms/accept
>> Method: POST
### Request Body:
<code>
{
  "userId": "user_id",
  "version": "1.0"
}
</code>

### Success Response:
<code>
{
  "success": true,
  "message": "Terms and conditions accepted",
  "termsStatus": {
    "accepted": true,
    "date": "2025-10-07T16:45:30.123Z",
    "version": "1.0"
  }
}
</code>

### Error responses: 
400 Bad Request: Missing UserID
404 Not Found: User Not Found
500 Server Error: Database error

## Check Terms Status
> Retrieves user's terms and conditions acceptance status.
>> URL: /api/terms/:userId
>> Method: GET

### Success Response:
<code>
{
  "termsAccepted": true,
  "termsAcceptedDate": "2025-10-07T16:45:30.123Z",
  "termsAcceptedVersion": "1.0"
}
</code>

### Error responses: 
404 Not Found: User Not Found
500 Server Error: Database error


# Database Schema
<code>
{
  // Existing user fields
  email: {
    type: String,
    required: true,
    unique: true
  },
  // Terms & Conditions fields
  termsAccepted: {
    type: Boolean,
    default: false
  },
  termsAcceptedDate: {
    type: Date,
    default: null
  },
  termsAcceptedVersion: {
    type: String,
    default: null
  }
}
</code>

# Testing
Run using `npm test`

# Frontend Integration
> Include these functions in frontend:

<code>
// Accept Terms & Conditions
async function acceptTerms(userId) {
  try {
    const response = await fetch('http://localhost:5000/api/terms/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        version: '1.0'
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error accepting terms:', error);
  }
}
</code>

<code>
// Check Terms Status
async function getTermsStatus(userId) {
  try {
    const response = await fetch(`http://localhost:5000/api/terms/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking terms status:', error);
  }
}
</code># AniMatch Backend API

## Upload Endpoint

### POST /api/upload
Creates a new user with optional profile picture.

**Request:**
- `username` (string, required): User's nickname  
- `file` (image, optional): Profile picture

**Response:**
```json
{
  "message": "User created",
  "user": {
    "username": "john_doe", 
    "profilePicture": {
      "url": "/uploads/filename.jpg",
      "isBlurred": true
    }
  }
}
```

## Setup
```bash
npm install
npm start
npm test
```# API
## Join Queue
> Adds a user to the matchmaking queue.
>> URL: /api/queue/join
>> Method: POST

## Leave Queue
> Removes a user from the matchmaking queue
>> URL: /api/queue/leave
>> Method: POST

## Check Queue Status
> Checks if user is in queue and attempts to find a match.
>> URL: /api/queue/status
>> Method: GET

# Database Schema
## Queue Collection
<code>
userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
},
    joinedAt: {
    type: Date,
    default: Date.now
},
    preferences: {
    type: Object,
    default: {} // expandable for iterations implementing matching preferences
}
</code>

## Chat Session
<code>
participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
}],
active: {
    type: Boolean,
    default: true
},
startedAt: {
    type: Date,
    default: Date.now
},
endedAt: {
    type: Date
}
</code>

# Testing
Run using `npm run dev`
Test with postman and create the API calls and monitor via mongodb compass