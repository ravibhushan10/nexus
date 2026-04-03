# NexusAI — Complete Codebase (All Phases Combined)

## Project Structure

```
nexusai/
├── server/          ← Backend (Express + MongoDB + Groq)
│   ├── models/
│   │   ├── User.js           ← OTP, OAuth, systemPrompt, language fields
│   │   ├── Conversation.js
│   │   └── Payment.js
│   ├── routes/
│   │   ├── auth.js           ← Full OTP, OAuth, avatar, system-prompt, language
│   │   ├── chat.js           ← RAG removed, images added, limit email trigger
│   │   ├── conversations.js
│   │   ├── payment.js        ← Razorpay
│   │   └── analytics.js
│   ├── middleware/auth.js
│   ├── utils/
│   │   ├── sendEmail.js      ← OTP + limit notification emails
│   │   ├── cost.js
│   │   └── logger.js
│   ├── index.js              ← Voice/docs routes removed
│   ├── package.json          ← nodemailer added
│   └── .env.example
│
└── client/          ← Frontend (React + Vite)
    ├── src/
    │   ├── components/
    │   │   ├── AuthModals.jsx        ← CodeForge-style modal auth
    │   │   ├── AuthModals.module.css
    │   │   ├── chat/MessageBubble.jsx
    │   │   ├── layout/Sidebar.jsx   ← Docs removed, Help fixed
    │   │   └── ui/
    │   ├── context/
    │   │   ├── AuthContext.jsx       ← oauthLogin added
    │   │   └── SidebarContext.jsx
    │   ├── hooks/
    │   │   ├── useAuth.js            ← Firebase OAuth
    │   │   └── useChat.js            ← RAG removed, systemPrompt from MongoDB
    │   ├── pages/
    │   │   ├── Chat.jsx              ← Claude-style input, image/doc upload, system prompt fix
    │   │   ├── Settings.jsx          ← Avatar upload, system prompt saves to MongoDB
    │   │   ├── Help.jsx              ← New NexusAI help page
    │   │   ├── Analytics.jsx         ← "Documents Indexed" renamed
    │   │   └── Upgrade.jsx           ← RAG/Voice removed
    │   ├── App.jsx                   ← Modal auth, /help route added
    │   ├── main.jsx
    │   ├── firebaseConfig.js
    │   └── index.css
    ├── package.json                  ← firebase added
    └── .env.example
```

## Quick Setup

### 1. Server Setup
```bash
cd server
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, GROQ_API_KEY
# Fill in RESEND_API_KEY (or GMAIL_USER + GMAIL_PASS for dev)
# Fill in RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET
npm run dev
```

### 2. Client Setup
```bash
cd client
npm install
cp .env.example .env
# Fill in VITE_API_URL=http://localhost:5000
# Fill in Firebase keys (from console.firebase.google.com)
npm run dev
```

## Key Changes From Original NexusAI

### ✅ Fixed Bugs
- **System Prompt bug**: No longer redirects when prompt is set. Reads from MongoDB (not localStorage). Toggle works correctly.
- **RAG removed**: All RAG code cleaned out of chat route and frontend.
- **Voice removed**: Voice route removed from index.js.
- **Documents page removed**: Route removed from App.jsx.

### ✅ New Features
- **OTP email verification** on register
- **Forgot password** with OTP reset flow
- **Google + GitHub OAuth** via Firebase
- **Avatar upload** in Settings → Profile
- **Image upload in chat** — attach images and ask questions
- **Document upload in chat** — attach PDFs/docs and get answers
- **Claude-style chat input** — paperclip, model selector, system prompt toggle, send button
- **Email notification** when daily limit is reached
- **Help page** with FAQ accordion + contact form
- **Hindi/English language** preference (backend ready, UI toggle in sidebar)
- **System prompt saved to MongoDB** — works on all devices

### ✅ Auth System (CodeForge-style modals)
- Login modal with: email/password, forgot password (OTP), Google OAuth, GitHub OAuth
- Register modal with: name/email/password/confirm, 6-box OTP verification, Google/GitHub OAuth
- All error codes handled: EMAIL_TAKEN, EMAIL_NOT_VERIFIED, OTP_LOCKED, OTP_EXPIRED
- Password strength checklist (5 rules)
- 120s resend cooldown

## Environment Variables

### Server (.env)
```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb+srv://...
JWT_SECRET=min_32_chars
JWT_REFRESH_SECRET=min_32_chars
GROQ_API_KEY=gsk_...
RESEND_API_KEY=re_...         # OR use Gmail below
GMAIL_USER=your@gmail.com
GMAIL_PASS=app_password
EMAIL_FROM=NexusAI <noreply@yourdomain.com>
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
```

### Client (.env)
```
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:xxx:web:xxx
```
# nexus
