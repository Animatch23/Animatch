# AniMatch

AniMatch is a matching and chat platform for DLSU students, built with Next.js (frontend) and Express.js (backend).

## 📚 Documentation

- **[Setup Checklist](./SETUP_CHECKLIST.md)** - Step-by-step checklist for configuration and testing ⭐ **START HERE**
- **[Summary](./SUMMARY.md)** - Quick overview of all updates and what was accomplished
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Complete setup instructions for local development and production deployment
- **[Authentication Flow Summary](./AUTH_FLOW_SUMMARY.md)** - Detailed explanation of the user authentication and registration flow
- **[Flow Diagram](./FLOW_DIAGRAM.md)** - Visual flowcharts showing the complete user journey
- **[Before/After Comparison](./BEFORE_AFTER.md)** - Side-by-side comparison of old vs new authentication flow
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Solutions to common issues and debugging tips
- **[Changelog](./CHANGELOG.md)** - Detailed list of all changes made to the codebase

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account or local MongoDB
- Google Cloud Console project with OAuth 2.0 credentials

### Installation

1. **Install all dependencies**
```bash
npm run install:all
```

2. **Configure environment variables**
   - Backend: Copy `backend/.env.example` to `backend/.env`
   - Frontend: Copy `frontend/.env.example` to `frontend/.env`
   - Fill in all required values (see [Deployment Guide](./DEPLOYMENT_GUIDE.md))

3. **Start development servers**
```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:5000

## 🔐 Authentication Flow

### New User Registration
1. Login with DLSU Google account (`/login`)
2. Accept terms and conditions (`/terms`)
3. Set up profile with username and optional photo (`/profile-setup`)
4. Access main application (`/match`)

### Existing User Login
1. Login with DLSU Google account
2. Automatically redirect to main application

**Important:** Session tokens are only stored after:
- New users complete profile setup
- Existing users authenticate successfully

See [Authentication Flow Summary](./AUTH_FLOW_SUMMARY.md) for detailed flow diagrams.

## 🏗️ Project Structure

```
Animatch/
├── frontend/          # Next.js frontend application
│   ├── src/
│   │   ├── app/      # Next.js app router pages
│   │   └── components/ # Reusable React components
│   └── public/       # Static assets
├── backend/          # Express.js backend API
│   └── src/
│       ├── routes/   # API route handlers
│       ├── controllers/ # Business logic
│       ├── models/   # MongoDB schemas
│       └── middleware/ # Authentication middleware
└── docs/            # Additional documentation
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend E2E Tests
```bash
cd frontend
npm run cypress:open
```

## 📦 Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start only frontend
npm run dev:backend      # Start only backend

# Installation
npm run install:all      # Install dependencies for both projects
npm run install:frontend # Install only frontend dependencies
npm run install:backend  # Install only backend dependencies
```

## 🔒 Security Features

- DLSU email validation (@dlsu.edu.ph)
- JWT-based session management
- Google OAuth 2.0 authentication
- CORS protection
- Profile photo auto-blur functionality

## 🚀 Deployment

See the complete [Deployment Guide](./DEPLOYMENT_GUIDE.md) for:
- Environment variable configuration
- Backend deployment (Railway/Render/Heroku)
- Frontend deployment (Vercel)
- Production considerations
- Troubleshooting common issues

## 📝 License

This project is for educational purposes as part of STSWENG coursework at De La Salle University.

## 👥 Contributing

This is a student project. For issues or questions, please contact the development team.

---

**Version:** 1.0.0  
**Last Updated:** November 8, 2025
