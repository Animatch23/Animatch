# AniMatch Authentication Flow Summary

## 🔄 Complete User Journey

### New User (First Time Login)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Login Page (/login)                                     │
├─────────────────────────────────────────────────────────────────┤
│ • User clicks "Login with Google"                               │
│ • Google OAuth authentication                                   │
│ • Backend validates DLSU email (@dlsu.edu.ph)                   │
│ • Backend creates JWT session token                             │
│ • Check if user exists in database                              │
│                                                                  │
│ Result: User does NOT exist                                     │
│ Action:                                                          │
│   - Store in sessionStorage:                                    │
│     * pendingEmail                                              │
│     * pendingToken (temp, NOT in localStorage yet!)            │
│   - Redirect to /terms                                          │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Terms Page (/terms)                                     │
├─────────────────────────────────────────────────────────────────┤
│ • Display terms and conditions                                  │
│ • User must accept or cancel                                    │
│                                                                  │
│ If ACCEPT:                                                       │
│   - Mark "termsAccepted" = true in sessionStorage              │
│   - Redirect to /profile-setup                                  │
│                                                                  │
│ If CANCEL:                                                       │
│   - Clear sessionStorage (pendingEmail, pendingToken)           │
│   - Redirect to /login                                          │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Profile Setup (/profile-setup)                          │
├─────────────────────────────────────────────────────────────────┤
│ • Verify sessionStorage has:                                    │
│   - pendingEmail                                                │
│   - pendingToken                                                │
│   - termsAccepted = true                                        │
│                                                                  │
│ • User enters username (REQUIRED)                               │
│ • User uploads profile photo (OPTIONAL)                         │
│                                                                  │
│ On Submit:                                                       │
│   - POST to /api/upload with FormData:                          │
│     * email                                                      │
│     * username                                                   │
│     * profilePhoto (if uploaded)                                │
│     * acceptTerms = true                                        │
│   - Backend creates User in database with:                      │
│     * All profile data                                          │
│     * termsAccepted = true                                      │
│     * termsAcceptedDate = now                                   │
│     * termsAcceptedVersion = "1.0"                              │
│                                                                  │
│ ⭐ SUCCESS - NOW store token:                                    │
│   - localStorage.setItem("sessionToken", pendingToken)          │
│   - localStorage.setItem("userEmail", email)                    │
│   - Clear sessionStorage                                        │
│   - Redirect to /match                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Existing User (Returning Login)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Login Page (/login)                                     │
├─────────────────────────────────────────────────────────────────┤
│ • User clicks "Login with Google"                               │
│ • Google OAuth authentication                                   │
│ • Backend validates DLSU email                                  │
│ • Backend creates JWT session token                             │
│ • Check if user exists in database                              │
│                                                                  │
│ Result: User EXISTS                                             │
│ Action:                                                          │
│   ⭐ Immediately store token:                                    │
│   - localStorage.setItem("sessionToken", sessionToken)          │
│   - localStorage.setItem("userEmail", email)                    │
│   - Redirect to /match                                          │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Session Token Storage Rules

### ❌ Token NOT stored when:
- User just authenticated with Google (new user)
- User is on terms page
- User is on profile setup page

### ✅ Token IS stored when:
1. **New User**: After successfully creating profile in `/profile-setup`
2. **Existing User**: Immediately after Google authentication

### Why this approach?
- Prevents incomplete registrations from having active sessions
- Ensures user has accepted terms AND created profile before access
- Clean separation between authentication and authorization

## 🗄️ Storage Locations

### sessionStorage (Temporary)
```javascript
// Used during new user registration flow only
{
  pendingEmail: "user@dlsu.edu.ph",
  pendingToken: "jwt_token_here",
  termsAccepted: "true"
}
```

**Cleared when:**
- User completes profile setup
- User cancels on terms page
- User manually navigates away

### localStorage (Persistent)
```javascript
// Used for authenticated sessions
{
  sessionToken: "jwt_token_here",
  userEmail: "user@dlsu.edu.ph"
}
```

**Set when:**
- Existing user logs in
- New user completes profile setup

**Checked by:**
- All protected routes (`/match/*`)
- Root page (`/`) for redirect logic

## 🛡️ Route Protection

### Public Routes
- `/login` - Login page
- `/terms` - Terms acceptance (new users, checks sessionStorage)
- `/profile-setup` - Profile creation (new users, checks sessionStorage)

### Protected Routes
- `/match` - Main app (requires localStorage.sessionToken)
- `/match/queue` - Matching queue
- `/match/chat` - Chat interface
- All other `/match/*` routes

### Root Route (`/`)
- If `sessionToken` exists → redirect to `/match`
- If no `sessionToken` → redirect to `/login`

## 📊 Backend API Endpoints

### Authentication
```
POST /api/auth/google
  Body: { code: "google_auth_code" }
  Returns: { token, email }
  Used by: /login page
```

### User Creation
```
POST /api/upload
  Body: FormData {
    email: string (required)
    username: string (required)
    profilePhoto: File (optional)
    acceptTerms: boolean (optional)
  }
  Returns: { message, user }
  Used by: /profile-setup page
```

### User Check
```
POST /api/exist
  Body: { email: string }
  Returns: { exists: boolean }
  Used by: /login page
```

### Terms Status
```
GET /api/terms/:userId
  Returns: { termsAccepted, termsAcceptedDate, termsAcceptedVersion }
  Used for: Checking existing user terms status

POST /api/terms/accept
  Body: { userId, version }
  Returns: { success, termsStatus }
  Note: Only updates existing users (not used in new user flow)
```

## 🐛 Common Issues & Solutions

### Issue: "Session expired" on profile setup
**Cause:** sessionStorage was cleared or user navigated away  
**Solution:** Redirect to /login to restart flow

### Issue: Token stored but user has no profile
**Cause:** Old flow that stored token before profile creation  
**Solution:** Fixed - token now stored only after profile creation

### Issue: Existing user sees terms page
**Cause:** User existence check failed  
**Solution:** Verify /api/exist endpoint works correctly

### Issue: New user can't access /match
**Cause:** Token not stored after profile creation  
**Solution:** Verify localStorage.setItem is called in profile-setup

## ✅ Testing Checklist

- [ ] New user can complete full flow: login → terms → profile → match
- [ ] New user canceling terms returns to login (clears session)
- [ ] Existing user logs in directly to match page
- [ ] Protected routes redirect unauthenticated users to login
- [ ] Session persists across browser refresh
- [ ] Token stored only after profile creation (new users)
- [ ] Token stored immediately after login (existing users)
- [ ] Profile photos are uploaded and blurred correctly
- [ ] Terms acceptance is saved in database

---

**Last Updated:** November 8, 2025  
**Version:** 1.0.0
