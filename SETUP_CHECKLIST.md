# 🚀 AniMatch Quick Setup Checklist

Use this checklist to ensure everything is configured correctly.

---

## ✅ Initial Setup

### 1. Clone and Install
- [ ] Clone the repository
- [ ] Run `npm run install:all` from root directory
- [ ] Verify both `backend/node_modules` and `frontend/node_modules` exist

### 2. MongoDB Setup
- [ ] Create MongoDB Atlas account (if not exists)
- [ ] Create new cluster or use existing
- [ ] Create database user with username and password
- [ ] Get connection string (replace `<password>` with actual password)
- [ ] Add database name to connection string (e.g., `/animatch`)
- [ ] Configure Network Access (allow your IP or 0.0.0.0/0)

### 3. Google OAuth Setup
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create project or select existing
- [ ] Enable Google+ API
- [ ] Go to Credentials → Create OAuth 2.0 Client ID
- [ ] Add authorized redirect URIs:
  - [ ] `http://localhost:3000/login` (development)
  - [ ] Production URL + `/login` (when deploying)
- [ ] Copy Client ID and Client Secret

---

## ✅ Environment Configuration

### Backend Configuration
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Fill in the following:
  - [ ] `MONGO_URI` - Your MongoDB connection string
  - [ ] `PORT` - 5000 (or your preferred port)
  - [ ] `JWT_SECRET` - Random secret (use `openssl rand -base64 32`)
  - [ ] `GOOGLE_CLIENT_ID` - From Google Console
  - [ ] `GOOGLE_CLIENT_SECRET` - From Google Console
  - [ ] `GOOGLE_REDIRECT_URI` - http://localhost:3000/login
  - [ ] `NEXT_PUBLIC_API_URL` - http://localhost:5000

### Frontend Configuration
- [ ] Copy `frontend/.env.example` to `frontend/.env`
- [ ] Fill in the following:
  - [ ] `NEXTAUTH_URL` - http://localhost:3000
  - [ ] `NEXTAUTH_SECRET` - Random secret
  - [ ] `GOOGLE_CLIENT_ID` - Same as backend
  - [ ] `GOOGLE_CLIENT_SECRET` - Same as backend
  - [ ] `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` - http://localhost:3000/login
  - [ ] `NEXT_PUBLIC_API_URL` - http://localhost:5000

---

## ✅ Development Testing

### Start Servers
- [ ] Open terminal in project root
- [ ] Run `npm run dev`
- [ ] Backend should start on http://localhost:5000
- [ ] Frontend should start on http://localhost:3000
- [ ] Check for any error messages in console

### Test Backend
- [ ] Visit http://localhost:5000/api/ping
- [ ] Should see `{"pong": true}`
- [ ] Check backend console for "Server running on port 5000"
- [ ] Check backend console for "MongoDB connected successfully"

### Test Frontend
- [ ] Visit http://localhost:3000
- [ ] Should redirect to /login page
- [ ] Should see AniMatch logo and login button
- [ ] No errors in browser console

---

## ✅ Authentication Flow Testing

### Test New User Registration
- [ ] Click "Login with DLSU Google Account"
- [ ] Authenticate with Google (use @dlsu.edu.ph email)
- [ ] Should redirect back to app
- [ ] Should show Terms & Conditions page
- [ ] Read and click "Accept & Continue"
- [ ] Should show Profile Setup page
- [ ] Enter username (3+ characters, alphanumeric + underscore)
- [ ] Optionally upload profile photo
- [ ] Click "Complete Setup"
- [ ] Should redirect to /match page
- [ ] Refresh browser - should stay logged in

### Test Terms Cancellation
- [ ] Clear localStorage and sessionStorage
- [ ] Login with Google again (as new user)
- [ ] On Terms page, click "Cancel"
- [ ] Should redirect back to /login
- [ ] sessionStorage should be cleared

### Test Existing User Login
- [ ] Already completed registration once
- [ ] Visit /login
- [ ] Click "Login with DLSU Google Account"
- [ ] Should skip terms and profile setup
- [ ] Should go directly to /match page

### Test Protected Routes
- [ ] Clear localStorage
- [ ] Try to visit /match
- [ ] Should redirect to /login
- [ ] Login and complete flow
- [ ] Should now access /match successfully

---

## ✅ Database Verification

### Check User Creation
- [ ] Go to MongoDB Atlas
- [ ] Navigate to your cluster → Collections
- [ ] Find the `users` collection
- [ ] Should see user document with:
  - [ ] `email` field
  - [ ] `username` field
  - [ ] `profilePicture` object (if photo uploaded)
  - [ ] `termsAccepted: true`
  - [ ] `termsAcceptedDate` (timestamp)
  - [ ] `termsAcceptedVersion: "1.0"`
  - [ ] `createdAt` and `updatedAt` timestamps

---

## ✅ Production Deployment

### Backend Deployment (Railway/Render/Heroku)
- [ ] Connect GitHub repository
- [ ] Set all environment variables from `.env`
- [ ] Update `GOOGLE_REDIRECT_URI` to production frontend URL
- [ ] Set `NODE_ENV=production`
- [ ] Deploy backend
- [ ] Test API endpoint: `https://your-backend.com/api/ping`

### Frontend Deployment (Vercel)
- [ ] Connect GitHub repository
- [ ] Set root directory to `frontend`
- [ ] Set all environment variables from `.env`
- [ ] Update `NEXT_PUBLIC_API_URL` to production backend URL
- [ ] Update `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` to production domain
- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Deploy frontend
- [ ] Visit production URL

### Post-Deployment Configuration
- [ ] Update Google OAuth redirect URIs:
  - [ ] Add `https://yourdomain.com/login`
  - [ ] Add to authorized JavaScript origins
- [ ] Update backend CORS:
  - [ ] Add production frontend URL to `allowedOrigins`
- [ ] Update MongoDB Network Access:
  - [ ] Add production hosting IPs
  - [ ] Or allow all (0.0.0.0/0) with strong credentials
- [ ] Test complete flow in production
- [ ] Verify new user registration works
- [ ] Verify existing user login works
- [ ] Check production logs for any errors

---

## ✅ Common Checks

### If Something Doesn't Work
- [ ] Check browser console for JavaScript errors
- [ ] Check backend console for API errors
- [ ] Verify all environment variables are set correctly
- [ ] Verify MongoDB connection is active
- [ ] Verify Google OAuth configuration matches exactly
- [ ] Clear browser cache and storage
- [ ] Restart both dev servers
- [ ] Try in incognito/private browsing mode

### Storage Verification (Browser DevTools)
```javascript
// Check these in browser console

// Should be empty for new users before profile creation
localStorage.getItem('sessionToken')

// Should exist during registration
sessionStorage.getItem('pendingEmail')
sessionStorage.getItem('pendingToken')
sessionStorage.getItem('termsAccepted')

// Should exist after complete registration
localStorage.getItem('sessionToken')
localStorage.getItem('userEmail')
```

---

## 🎯 Success Criteria

You've successfully set up AniMatch when:

- ✅ Backend connects to MongoDB
- ✅ Frontend loads without errors
- ✅ Google OAuth login works
- ✅ New users go through: Login → Terms → Profile → Match
- ✅ Existing users go: Login → Match
- ✅ Session tokens stored at correct time
- ✅ User data saved correctly in database
- ✅ Terms acceptance recorded in database
- ✅ Protected routes redirect when not authenticated
- ✅ Profile photos upload and blur correctly

---

## 📖 Need More Help?

Refer to these documents:
- **Quick Overview:** `SUMMARY.md`
- **Detailed Setup:** `DEPLOYMENT_GUIDE.md`
- **Understanding Flow:** `AUTH_FLOW_SUMMARY.md`, `FLOW_DIAGRAM.md`
- **Problems:** `TROUBLESHOOTING.md`
- **What Changed:** `CHANGELOG.md`, `BEFORE_AFTER.md`

---

**Happy Coding! 🎉**

Last Updated: November 8, 2025
