# AniMatch Backend API

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
```