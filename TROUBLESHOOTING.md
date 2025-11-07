# AniMatch Troubleshooting Guide

## 🔧 Common Issues and Solutions

---

## Authentication Issues

### Issue: "Session expired" error on profile setup page

**Symptoms:**
- Error message appears when trying to submit profile
- Page redirects to login

**Causes:**
- sessionStorage was cleared
- User opened page in new tab/window
- Browser closed and reopened

**Solutions:**
1. Check sessionStorage in browser DevTools (Application → Storage)
2. Verify these keys exist:
   - `pendingEmail`
   - `pendingToken`
   - `termsAccepted`
3. If missing, user must restart registration from /login

**Prevention:**
- Complete registration in same browser tab/session
- Don't close browser during registration

---

### Issue: User can't access /match after login

**Symptoms:**
- Redirects to login page
- Gets authentication error

**Causes:**
- Session token not stored in localStorage
- Token expired or invalid
- User document not created in database

**Solutions:**
1. Check localStorage in DevTools:
   ```javascript
   localStorage.getItem('sessionToken')
   localStorage.getItem('userEmail')
   ```
2. Verify user exists in MongoDB database
3. Check if token is valid:
   - Copy token from localStorage
   - Decode at jwt.io to check expiration
4. Clear localStorage and login again:
   ```javascript
   localStorage.clear()
   // Then visit /login
   ```

---

### Issue: Existing user sees terms page

**Symptoms:**
- User who already registered sees terms page on login

**Causes:**
- `/api/exist` endpoint returning false incorrectly
- Database query failing
- Email mismatch in database

**Solutions:**
1. Check backend logs for errors
2. Verify MongoDB connection
3. Test `/api/exist` endpoint directly:
   ```bash
   curl -X POST http://localhost:5000/api/exist \
     -H "Content-Type: application/json" \
     -d '{"email":"user@dlsu.edu.ph"}'
   ```
4. Check database for user with exact email
5. Verify email field is indexed in MongoDB

---

### Issue: Google OAuth redirect fails

**Symptoms:**
- Error after Google sign-in
- Redirect URI mismatch error

**Causes:**
- Redirect URI not configured in Google Cloud Console
- Mismatch between configured URI and actual redirect

**Solutions:**
1. Verify Google Cloud Console settings:
   - Go to APIs & Services → Credentials
   - Check OAuth 2.0 Client IDs
   - Verify Authorized redirect URIs includes:
     - `http://localhost:3000/login` (development)
     - Your production URL + `/login`

2. Check environment variables match:
   ```bash
   # Backend .env
   GOOGLE_REDIRECT_URI=http://localhost:3000/login

   # Frontend .env
   NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/login
   ```

3. Ensure URIs are EXACTLY the same (including protocol, port, path)

---

## Profile Setup Issues

### Issue: Photo upload fails

**Symptoms:**
- Error when submitting with photo
- "Upload error" message

**Causes:**
- File size too large (>5MB)
- Invalid file format
- Backend uploads directory doesn't exist
- Multer configuration error

**Solutions:**
1. Check file size: Must be < 5MB
2. Check file type: Should be image/* (jpg, png, gif)
3. Verify backend uploads directory exists:
   ```bash
   cd backend
   mkdir uploads
   ```
4. Check backend console for multer errors
5. Try uploading without photo first to isolate issue

---

### Issue: Username validation fails

**Symptoms:**
- Can't submit form
- Validation error messages

**Causes:**
- Username doesn't meet requirements

**Solutions:**
- Username requirements:
  - ✅ Minimum 3 characters
  - ✅ Only letters, numbers, and underscores
  - ✅ No spaces or special characters
- Try example: `test_user123`

---

### Issue: Profile created but still can't access /match

**Symptoms:**
- Profile submission succeeds
- Redirects to /match but then back to /login

**Causes:**
- Token not stored in localStorage after profile creation
- JavaScript error during token storage

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify token storage in profile-setup/page.js:
   ```javascript
   localStorage.setItem("sessionToken", token);
   localStorage.setItem("userEmail", email);
   ```
3. Clear all storage and try again:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

---

## Database Issues

### Issue: MongoDB connection fails

**Symptoms:**
- Backend won't start
- "Failed to connect to MongoDB" error

**Causes:**
- Invalid MongoDB URI
- Network access not configured
- Database user credentials wrong

**Solutions:**
1. Verify MONGO_URI in backend/.env
2. Check MongoDB Atlas:
   - Network Access → Add your IP or allow all (0.0.0.0/0)
   - Database Access → Verify user credentials
3. Test connection:
   ```bash
   cd backend
   node -e "require('./src/config/db.js').default()"
   ```
4. Check if MongoDB cluster is active (not paused)

---

### Issue: Terms not saved in database

**Symptoms:**
- User created but termsAccepted is false
- Terms fields are null

**Causes:**
- `acceptTerms` flag not sent from frontend
- Backend not processing terms flag

**Solutions:**
1. Verify frontend sends flag:
   ```javascript
   formData.append('acceptTerms', 'true');
   ```
2. Check backend uploadRoute.js processes flag:
   ```javascript
   const acceptTermsFlag = req.body.acceptTerms === 'true';
   ```
3. Verify User model has terms fields
4. Check database document directly in MongoDB Atlas

---

## CORS Issues

### Issue: CORS errors in browser console

**Symptoms:**
- "CORS policy" error messages
- API calls failing with CORS errors

**Causes:**
- Frontend URL not in backend allowed origins
- CORS not configured correctly

**Solutions:**
1. Check backend/src/server.js:
   ```javascript
   const allowedOrigins = [
     'http://localhost:3000',
     // Add your production URL here
   ];
   ```
2. Verify credentials: true is set in CORS config
3. For production, add your Vercel URL to allowedOrigins
4. Restart backend after CORS changes

---

## Environment Variable Issues

### Issue: "Environment variable not defined" errors

**Symptoms:**
- Backend won't start
- Frontend build fails
- Variables showing as undefined

**Causes:**
- .env file missing
- Variables not properly defined
- Next.js env variables not prefixed with NEXT_PUBLIC_

**Solutions:**
1. Copy .env.example to .env:
   ```bash
   # Backend
   cd backend
   cp .env.example .env

   # Frontend
   cd frontend
   cp .env.example .env
   ```

2. Fill in all required values

3. For Next.js public variables, use NEXT_PUBLIC_ prefix:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

4. Restart both servers after env changes

5. For production, set env vars in hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Railway/Render: Settings → Environment Variables

---

## Testing Issues

### Issue: Backend tests failing

**Symptoms:**
- Jest tests fail
- Database errors in tests

**Causes:**
- Test database not configured
- Environment not set to 'test'

**Solutions:**
1. Create .env.test in backend directory
2. Use separate test database:
   ```bash
   MONGODB_URI=mongodb+srv://user:pass@cluster/animatch-test
   ```
3. Run tests:
   ```bash
   cd backend
   npm test
   ```

---

## Production Issues

### Issue: App works locally but not in production

**Symptoms:**
- Production deployment fails
- Features work locally but not deployed

**Causes:**
- Environment variables not set in production
- Build errors not visible locally
- CORS/OAuth not configured for production URLs

**Solutions:**
1. **Check Environment Variables:**
   - All env vars from .env must be set in hosting platform
   - Update URLs to production values

2. **Google OAuth:**
   - Add production redirect URI to Google Cloud Console
   - Update GOOGLE_REDIRECT_URI in backend env
   - Update NEXT_PUBLIC_GOOGLE_REDIRECT_URI in frontend env

3. **CORS:**
   - Add production frontend URL to backend allowedOrigins

4. **MongoDB:**
   - Update network access to allow production hosting IPs
   - Or use 0.0.0.0/0 (all IPs) with strong credentials

5. **Check logs:**
   - Vercel: View Function Logs
   - Railway/Render: View deployment logs

---

## Debug Tools & Commands

### Check localStorage/sessionStorage
```javascript
// In browser console
console.log('localStorage:', localStorage);
console.log('sessionStorage:', sessionStorage);
console.log('Token:', localStorage.getItem('sessionToken'));
```

### Clear all storage
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Test backend endpoints
```bash
# Check if backend is running
curl http://localhost:5000/api/ping

# Test user existence
curl -X POST http://localhost:5000/api/exist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@dlsu.edu.ph"}'

# Test with token
curl http://localhost:5000/api/queue/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Check MongoDB connection
```bash
cd backend
node -e "
  import('./src/config/db.js').then(db => {
    db.default().then(() => console.log('✅ Connected'));
  });
"
```

---

## Getting Help

### Before Asking for Help:

1. ✅ Check browser console for errors
2. ✅ Check backend console for errors
3. ✅ Verify all environment variables are set
4. ✅ Try clearing localStorage and sessionStorage
5. ✅ Review relevant documentation:
   - [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
   - [AUTH_FLOW_SUMMARY.md](./AUTH_FLOW_SUMMARY.md)
   - [FLOW_DIAGRAM.md](./FLOW_DIAGRAM.md)

### Include in Bug Report:

- 📱 Browser and version
- 🖥️ Operating system
- 📝 Steps to reproduce
- 🔴 Error messages (console and backend logs)
- 📸 Screenshots if applicable
- ✅ What you've already tried

---

## Quick Fixes Checklist

- [ ] Clear browser cache and storage
- [ ] Restart backend server
- [ ] Restart frontend dev server
- [ ] Check all environment variables
- [ ] Verify MongoDB is accessible
- [ ] Check Google OAuth configuration
- [ ] Verify CORS settings
- [ ] Check backend logs
- [ ] Check browser console
- [ ] Test with different browser

---

**Last Updated:** November 8, 2025  
**Version:** 1.0.0
