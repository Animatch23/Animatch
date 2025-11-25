# 🚀 Quick Start - Test Your Chat Feature

## Before You Start

### 1. Clear Your Database (CRITICAL!)
```bash
mongosh animatch
db.queues.drop()
db.chatsessions.deleteMany({})
db.messages.deleteMany({})
exit
```

### 2. Restart Backend Server
```bash
cd backend
npm run dev
```

Wait for: `Server with Socket.IO running on port 5000`

### 3. Restart Frontend
```bash
cd frontend
npm run dev
```

---

## 🧪 Test Procedure (2 Users Required)

### Setup
1. Open **Chrome** → Login as User A
2. Open **Firefox** (or Chrome Incognito) → Login as User B

### Test Flow

#### Step 1: Start Matching
**User A:**
1. Go to `http://localhost:3000/match`
2. Click "Start Matching"
3. Should see "Finding your match..." page

**User B:**
1. Go to `http://localhost:3000/match`
2. Click "Start Matching"
3. BOTH users should instantly redirect to chat

#### Step 2: Verify Chat Interface
**Both users should see:**
- ✅ Chat header with partner's username
- ✅ Empty message list (clean start)
- ✅ Text input at bottom
- ✅ "Send" button
- ✅ "End Chat" button (red, top right)

#### Step 3: Send Messages
**User A:**
1. Type: "Hello from User A"
2. Press Enter or click Send
3. Message should appear on RIGHT side (green bubble)

**User B:**
1. Should see "Hello from User A" on LEFT side (white bubble)
2. Type: "Hi back from User B"
3. Press Enter
4. Message appears on RIGHT side for User B

**User A:**
1. Should see "Hi back from User B" on LEFT side

#### Step 4: Typing Indicators
**User A:**
1. Start typing (don't send yet)

**User B:**
1. Should see "Typing..." appear at bottom of chat
2. Should disappear 1 second after User A stops typing

#### Step 5: Chat History
**User A:**
1. Refresh the page (F5)
2. Should see all previous messages load
3. Should NOT be redirected back to match page

---

## 🔍 What to Check in Console

### Backend Console (Terminal)
Look for these logs in order:
```
[QUEUE JOIN] User: email@example.com (username)
[QUEUE JOIN] Found match: email1 <-> email2
[QUEUE JOIN] Match created: <chatSessionId>
[SOCKET] User connected: <userId>
[SOCKET] User <userId> attempting to join room <chatId>
[SOCKET] User <userId> successfully joined room <chatId>
[SOCKET] Message sent in room <chatId> by <userId>
[SOCKET] Typing indicator: true in room <chatId>
```

### Frontend Console (Browser DevTools)
```
[ChatInterface] Fetching active chat (attempt 1/10)
[ChatInterface] Active chat session found: <chatSessionId>
[ChatInterface] Socket connected
[ChatInterface] Successfully joined chat room: { chatSessionId: ... }
[ChatInterface] Received message: { _id, content, sentAt, senderId }
[ChatInterface] Partner typing: true
```

---

## ❌ Common Issues

### Issue: Redirect Loop (back to /match)
**Cause:** Chat session not created yet  
**Solution:** Check backend logs for "Match created". If missing, queue matching failed.

### Issue: Messages not appearing
**Cause:** Socket.IO not connected  
**Solution:** Check browser console for "Socket connected". If missing, check CORS settings.

### Issue: Can't determine own messages (all on left)
**Cause:** currentUserId not set  
**Solution:** Check `/api/chat/active` response includes `currentUserId`

### Issue: "No active chat session found" after match
**Cause:** Database creation delay  
**Solution:** Backend already adds 500ms delay. If still failing, increase in queue page.

---

## ✅ Success Criteria

- [ ] No redirect loops
- [ ] Messages appear instantly for both users
- [ ] Own messages on right (green), partner on left (white)
- [ ] Typing indicator works
- [ ] Page refresh loads message history
- [ ] Chat expires properly after 30 minutes
- [ ] "End Chat" button works
- [ ] No errors in console

---

## 🆘 Emergency Rollback

If chat is completely broken:
```bash
git stash
git checkout main
```

Then debug one file at a time.

---

## 📞 Need Help?

Check `CHAT_FIXES_APPLIED.md` for detailed technical documentation.

**Good luck! 🍀**
