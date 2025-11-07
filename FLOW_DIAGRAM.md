# AniMatch Authentication Flow Diagram

## Visual Flow Chart

```
                                    START
                                      |
                                      v
                          ┌─────────────────────┐
                          │   User visits app   │
                          │    (/) or /login    │
                          └─────────────────────┘
                                      |
                                      v
                          ┌─────────────────────┐
                          │  Click "Login with  │
                          │   Google Account"   │
                          └─────────────────────┘
                                      |
                                      v
                          ┌─────────────────────┐
                          │  Google OAuth Flow  │
                          │  (DLSU email only)  │
                          └─────────────────────┘
                                      |
                                      v
                          ┌─────────────────────┐
                          │  Backend creates    │
                          │   JWT token         │
                          └─────────────────────┘
                                      |
                                      v
                          ┌─────────────────────┐
                          │  Check: User exists │
                          │   in database?      │
                          └─────────────────────┘
                                      |
                    ┌─────────────────┴─────────────────┐
                    |                                   |
              [YES - Existing User]            [NO - New User]
                    |                                   |
                    v                                   v
        ┌────────────────────────┐         ┌────────────────────────┐
        │  Store in localStorage │         │  Store in sessionStorage│
        │  • sessionToken        │         │  • pendingEmail        │
        │  • userEmail           │         │  • pendingToken        │
        └────────────────────────┘         └────────────────────────┘
                    |                                   |
                    v                                   v
        ┌────────────────────────┐         ┌────────────────────────┐
        │   Redirect to /match   │         │   Redirect to /terms   │
        │                        │         │                        │
        │       🎉 DONE!         │         └────────────────────────┘
        └────────────────────────┘                     |
                                                       v
                                          ┌────────────────────────┐
                                          │   Display Terms & Cond  │
                                          │   User must Accept or   │
                                          │        Cancel           │
                                          └────────────────────────┘
                                                       |
                                    ┌──────────────────┴──────────────────┐
                                    |                                     |
                              [User Cancels]                      [User Accepts]
                                    |                                     |
                                    v                                     v
                        ┌───────────────────────┐          ┌────────────────────────┐
                        │  Clear sessionStorage │          │  Set termsAccepted=true│
                        │  Redirect to /login   │          │   in sessionStorage    │
                        └───────────────────────┘          └────────────────────────┘
                                                                       |
                                                                       v
                                                          ┌────────────────────────┐
                                                          │ Redirect to            │
                                                          │  /profile-setup        │
                                                          └────────────────────────┘
                                                                       |
                                                                       v
                                                          ┌────────────────────────┐
                                                          │  User enters:          │
                                                          │  • Username (required) │
                                                          │  • Photo (optional)    │
                                                          └────────────────────────┘
                                                                       |
                                                                       v
                                                          ┌────────────────────────┐
                                                          │  POST /api/upload      │
                                                          │  with acceptTerms=true │
                                                          └────────────────────────┘
                                                                       |
                                                                       v
                                                          ┌────────────────────────┐
                                                          │  Create User in DB:    │
                                                          │  • email               │
                                                          │  • username            │
                                                          │  • profilePicture      │
                                                          │  • termsAccepted=true  │
                                                          │  • termsAcceptedDate   │
                                                          │  • termsVersion="1.0"  │
                                                          └────────────────────────┘
                                                                       |
                                                                       v
                                                          ┌────────────────────────┐
                                                          │ ⭐ NOW Store token:    │
                                                          │  localStorage:         │
                                                          │  • sessionToken        │
                                                          │  • userEmail           │
                                                          └────────────────────────┘
                                                                       |
                                                                       v
                                                          ┌────────────────────────┐
                                                          │  Clear sessionStorage  │
                                                          │  • pendingEmail        │
                                                          │  • pendingToken        │
                                                          │  • termsAccepted       │
                                                          └────────────────────────┘
                                                                       |
                                                                       v
                                                          ┌────────────────────────┐
                                                          │   Redirect to /match   │
                                                          │                        │
                                                          │       🎉 DONE!         │
                                                          └────────────────────────┘
```

## Storage State at Each Step

### New User Flow

| Step | sessionStorage | localStorage | Database |
|------|----------------|--------------|----------|
| After Google Auth | pendingEmail<br>pendingToken | (empty) | No user |
| After Terms Accept | pendingEmail<br>pendingToken<br>termsAccepted=true | (empty) | No user |
| After Profile Created | (cleared) | sessionToken<br>userEmail | User created with termsAccepted=true |

### Existing User Flow

| Step | sessionStorage | localStorage | Database |
|------|----------------|--------------|----------|
| After Google Auth | (empty) | sessionToken<br>userEmail | User exists |

## Protected Route Access

```
User attempts to access /match/*
            |
            v
    Check localStorage
      for sessionToken
            |
    ┌───────┴───────┐
    |               |
  [Exists]      [Missing]
    |               |
    v               v
 Allow          Redirect
 Access         to /login
```

## Key Decision Points

### ❓ When is token stored in localStorage?

**✅ New User:** After successful profile creation (step 8)  
**✅ Existing User:** Immediately after Google authentication (step 4)

### ❓ When are terms saved to database?

**✅ New User:** During profile creation via `/api/upload` with `acceptTerms=true`  
**❌ NOT during:** Terms page (user doesn't exist yet)

### ❓ What if user refreshes during registration?

- **On /terms:** sessionStorage persists → can continue
- **On /profile-setup:** sessionStorage persists → can continue
- **After closing browser:** sessionStorage cleared → must restart

### ❓ What if user navigates away?

- sessionStorage remains for that tab
- Opening in new tab → new session, no data
- User can return to complete registration

---

**Pro Tips:**

1. 🔍 Use browser DevTools → Application tab to inspect localStorage/sessionStorage
2. 🧪 Test by manually clearing storage to simulate different states
3. 🐛 Check console logs for detailed flow tracking
4. 📊 Monitor database to verify user creation and terms acceptance

---

**Last Updated:** November 8, 2025
