# AniMatch Deployment Guide

## 🎯 Authentication Flow Overview

### New User Registration Flow
1. **Login Page** (`/login`)
   - User authenticates with Google OAuth
   - System checks if user exists in database
   - If **new user**: Redirect to `/terms` (data stored in sessionStorage)
   - If **existing user**: Store sessionToken → Redirect to `/match`

2. **Terms & Conditions** (`/terms`)
   - User must accept terms to proceed
   - If Cancel: Redirect back to `/login` (clears sessionStorage)
   - If Accept: Mark terms accepted in sessionStorage → Redirect to `/profile-setup`

3. **Profile Setup** (`/profile-setup`)
   - User enters username (required)
   - User uploads profile photo (optional, auto-blurred)
   - On submit: Creates user in database with terms already accepted
   - **Session token is ONLY stored AFTER successful profile creation**
   - Redirect to `/match`

### Existing User Login Flow
1. User logs in with Google
2. System detects existing account
3. Session token stored immediately
4. Redirect to `/match`

## 🔐 Security & Session Management

### Session Token Storage
- **Development & Production**: Session tokens stored in `localStorage`
- Token created on successful Google authentication
- Token stored ONLY when:
  - Existing user logs in successfully
  - New user completes profile setup

### Protected Routes
- `/match/*` - Requires valid sessionToken
- All match-related pages check authentication on mount

## 📝 Environment Variables

### Backend (.env)
```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/animatch?retryWrites=true&w=majority

# Server
PORT=5000
JWT_SECRET=your_jwt_secret_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/login

# For production, update to your production URL:
# GOOGLE_REDIRECT_URI=https://yourdomain.com/login
```

### Frontend (.env)
```env
# NextAuth (if used)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/login

# API Backend URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# For production, update to your production URLs:
# NEXTAUTH_URL=https://yourdomain.com
# NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://yourdomain.com/login
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account (or local MongoDB)
- Google Cloud Console project with OAuth 2.0 credentials

### Installation

1. **Clone and Install Dependencies**
```bash
cd Animatch
npm run install:all
```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env` in both `/backend` and `/frontend`
   - Fill in all required values

3. **Setup Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:3000/login` (development)
     - Your production URL when deploying

4. **Start Development Servers**
```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually:
npm run dev:backend
npm run dev:frontend
```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🌐 Production Deployment

### Backend Deployment (Railway/Render/Heroku)

1. **Environment Variables to Set**
   - `MONGO_URI` - Your MongoDB connection string
   - `PORT` - Usually set by platform (5000 default)
   - `JWT_SECRET` - Strong random string
   - `GOOGLE_CLIENT_ID` - From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
   - `GOOGLE_REDIRECT_URI` - Your production frontend URL + /login
   - `NODE_ENV` - Set to `production`

2. **Build Command**
```bash
npm install
```

3. **Start Command**
```bash
npm start
```

4. **Update server.js CORS** (if needed)
   - Add your production frontend URL to `allowedOrigins` array

### Frontend Deployment (Vercel)

1. **Connect Repository**
   - Import your GitHub repository to Vercel
   - Set root directory to `frontend`

2. **Environment Variables**
   - Add all variables from frontend `.env`
   - Update URLs to production values

3. **Build Settings**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Deploy**
   - Vercel will auto-deploy on push to main branch

### Post-Deployment Configuration

1. **Update Google OAuth Redirect URIs**
   - Add production URL to authorized redirect URIs
   - Format: `https://yourdomain.com/login`

2. **Update MongoDB Network Access**
   - Allow connections from your hosting provider's IP ranges
   - Or allow access from anywhere (0.0.0.0/0) with strong credentials

3. **Test the Flow**
   - Test new user registration
   - Test existing user login
   - Verify terms acceptance
   - Test profile setup with photo upload

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Frontend E2E Tests
```bash
cd frontend
npm run cypress:open
```

## 📁 File Structure & Key Files

### Authentication Flow Files
```
frontend/src/app/
├── login/page.js          # Google OAuth login
├── terms/page.js          # Terms acceptance (new users only)
├── profile-setup/page.js  # Profile creation (new users only)
├── match/page.js          # Main app (protected)
└── page.js                # Root - redirects based on auth

frontend/src/components/
└── AuthGuard.js           # Authentication wrapper component

backend/src/
├── routes/
│   ├── authRoute.js       # Google OAuth token exchange
│   ├── uploadRoute.js     # Profile creation + terms acceptance
│   └── termsRoutes.js     # Terms status checking
├── controllers/
│   └── termsController.js # Terms logic
└── models/
    └── User.js            # User schema with terms fields
```

## 🔍 Debugging Common Issues

### "Session expired" on profile setup
- Check if sessionStorage has `pendingEmail` and `pendingToken`
- Verify user went through terms page first

### "User not found" when accepting terms
- New users should NOT call `/api/terms/accept` directly
- Terms are accepted during profile creation via `/api/upload`

### Google OAuth redirect fails
- Verify `GOOGLE_REDIRECT_URI` matches exactly in:
  - Google Cloud Console
  - Backend .env
  - Frontend .env (NEXT_PUBLIC_GOOGLE_REDIRECT_URI)

### CORS errors in production
- Add production frontend URL to backend `allowedOrigins` array
- Ensure credentials: true is set in CORS config

### Session token not persisting
- Check localStorage in browser DevTools
- Verify token is only stored after successful profile setup
- For existing users, check token stored immediately after login

## 📊 Database Schema

### User Model
```javascript
{
  email: String (required, unique),
  username: String (required),
  profilePicture: {
    url: String,
    isBlurred: Boolean (default: true)
  },
  termsAccepted: Boolean (default: false),
  termsAcceptedDate: Date,
  termsAcceptedVersion: String,
  timestamps: true
}
```

## 🛡️ Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` templates
2. **Use strong JWT secrets** - Generate with `openssl rand -base64 32`
3. **Validate DLSU emails** - Backend enforces `@dlsu.edu.ph` domain
4. **Implement rate limiting** - Prevent brute force attacks
5. **Use HTTPS in production** - Always encrypt data in transit
6. **Keep dependencies updated** - Run `npm audit` regularly

## 📞 Support & Contribution

For issues or questions:
- Check the Issues page on GitHub
- Review this deployment guide
- Contact the development team

---

**Last Updated:** November 8, 2025  
**Version:** 1.0.0
