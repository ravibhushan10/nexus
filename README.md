# NexusAI — Intelligent Chat

A modern, full-stack AI chat application powered by **Groq's ultra-fast inference engine**. Built with React, Vite, and Node.js — featuring real-time streaming, multi-modal support, OAuth authentication, and a built-in Razorpay payment system.

---

## 📸 Screenshots

<table align="center">
  <tr>
    <td align="center">
      <img src="screenshots/landing.png"><br/>
      <em>Landing Page</em>
    </td>
    <td align="center">
      <img src="screenshots/login.png"><br/>
      <em>Sign In / Register</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="screenshots/chat.png"><br/>
      <em>Chat Interface</em>
    </td>
    <td align="center">
      <img src="screenshots/sidebar.png"><br/>
      <em>Sidebar & Conversations</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="screenshots/analytics.png"><br/>
      <em>Analytics Dashboard</em>
    </td>
    <td align="center">
      <img src="screenshots/upgrade.png"><br/>
      <em>Pro Upgrade Page</em>
    </td>
  </tr>
</table>

---

## [🌐 Live Demo](https://nexus-three-mauve.vercel.app)

---

## 🌟 Features

### 💬 **AI Chat**
- Real-time streaming responses via Server-Sent Events (SSE)
- Multiple AI models — free tier (LLaMA 3.1 8B, Gemma2 9B, Qwen3 32B) and Pro (LLaMA 3.3 70B)
- Vision support — attach images and auto-switch to multimodal model
- Document Q&A — upload PDFs/TXTs and ask questions about them
- Follow-up suggestions generated after every response
- AI Memory — persist key-value facts about yourself across conversations
- Prompt Templates — save and reuse your favourite prompts

### 🗂️ **Conversations**
- Full CRUD — create, rename, delete conversations
- Pin conversations to the top of the sidebar
- Organise into folders
- Per-conversation system prompt
- Share conversations publicly via a cryptographically secure token
- Export conversations as Markdown

### 🔐 **Authentication**
- Email/password with 6-digit OTP verification (2-minute expiry, 15-min lockout)
- OAuth via Google & GitHub (Firebase) with conflict detection
- JWT access tokens (15 min) + refresh tokens (7 days, rotating)
- Secure two-step password reset: OTP → reset token → new password
- Avatar upload (2 MB limit, auto-cleanup of old files)

### 💳 **Payments**
- Monthly (₹10) and Annual (₹50) Pro plans via Razorpay
- HMAC-SHA256 signature verification on every payment
- Payment history and one-click downgrade

### 📊 **Analytics**
- 7-day rolling daily stats — messages, tokens, cost
- Daily usage limits: 20/day (Free), 500/day (Pro)
- Limit-reached email notifications

### 🎨 **UI/UX**
- Dark theme with custom design token system
- Fully responsive — mobile, tablet, desktop
- Collapsible sidebar with tooltips
- Markdown rendering with syntax-highlighted code blocks
- Smooth SSE token streaming with buffered rendering

---

## 🛠️ Technologies Used

### Frontend (Client)

| Technology           | Purpose                     | Version  |
|----------------------|-----------------------------|----------|
| React                | UI Framework                | 18+      |
| Vite                 | Build Tool                  | 5+       |
| React Router DOM     | Client-side Routing         | 6+       |
| Tailwind CSS         | Utility-first Styling       | 3+       |
| Axios                | HTTP Client + Interceptors  | Latest   |
| Firebase             | Google & GitHub OAuth       | 10+      |
| React Markdown       | Markdown Rendering          | Latest   |
| React Syntax Highlighter | Code Block Highlighting | Latest   |
| Recharts             | Analytics Charts            | Latest   |
| Lucide React         | Icon Library                | Latest   |
| React Hot Toast      | Notifications               | Latest   |

### Backend (Server)

| Technology    | Purpose                         | Version |
|---------------|---------------------------------|---------|
| Node.js       | Runtime Environment             | 18+     |
| Express.js    | Web Framework                   | Latest  |
| MongoDB       | Database                        | Latest  |
| Mongoose      | ODM                             | Latest  |
| JWT           | Access & Refresh Token Auth     | —       |
| bcryptjs      | Password Hashing (12 rounds)    | —       |
| Groq SDK      | AI Inference (LLaMA, Gemma)     | Latest  |
| Razorpay      | Payment Processing              | Latest  |
| Multer        | Avatar File Uploads             | Latest  |
| Nodemailer    | Transactional Emails            | Latest  |

### DevOps & Tools

| Tool      | Purpose               |
|-----------|-----------------------|
| Vercel    | Frontend Deployment   |
| Railway   | Backend Deployment    |
| Firebase  | OAuth Provider        |
| Git       | Version Control       |
| ESLint    | Code Linting          |

---

## 🚀 Getting Started

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/ravibhushan10/NexusAI.git
   cd nexusai
   ```

2. **Install Client Dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Install Server Dependencies**
   ```bash
   cd ../server
   npm install
   ```

4. **Client Environment Variables — create `.env` in `client/`**
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **Server Environment Variables — create `.env` in `server/`**
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_jwt_refresh_secret
   GROQ_API_KEY=your_groq_api_key
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   EMAIL_DEV_MODE=false
   GMAIL_USER=your email id 
   GMAIL_PASS=your 16 digit app pass key 
   EMAIL_FROM=NexusAI <no-reply@example.com>
   RESEND_API_KEY=your resend api key
   ```

6. **Start the Server**
   ```bash
   cd server
   npm run dev
   # Server will run on http://localhost:5000
   ```

7. **Start the Client** (in a new terminal)
   ```bash
   cd client
   npm run dev
   # Client will run on http://localhost:5173
   ```

---

## 📖 Usage Guide

### Starting a Conversation

1. **Sign Up / Login**
   - Create a new account with email + OTP verification
   - Or sign in instantly with Google / GitHub OAuth

2. **Chat**
   - Type a message and hit Enter or click Send
   - Attach images (JPG, PNG, WEBP) for vision questions
   - Attach documents (PDF, TXT, MD) to ask questions about them
   - Click the model selector to switch between available AI models

3. **Manage Conversations**
   - Rename, pin, or delete conversations from the sidebar
   - Organise conversations into folders
   - Share any conversation via a public link

4. **Personalise**
   - Go to Settings → System Prompt to set a custom AI personality
   - Add AI Memory entries so NexusAI remembers things about you
   - Save reusable Prompt Templates for frequent tasks

5. **Upgrade to Pro**
   - Go to the Upgrade page to unlock 500 msg/day and LLaMA 3.3 70B
   - Pay securely via Razorpay (UPI, cards, net banking)

6. **Analytics**
   - View your 7-day message and token usage charts on the Analytics page

---

## 🤝 Contributing

### How to Contribute

1. **Fork the Repository**
   - Click the **Fork** button at the top right of this repository

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/ravibhushan10/NexusAI.git
   cd nexusai
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```

4. **Make Your Changes**
   - Write clean, readable code
   - Follow the existing code style
   - Test your changes thoroughly

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m 'Add some AmazingFeature'
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/AmazingFeature
   ```

7. **Open a Pull Request**
   - Go to your forked repository on GitHub
   - Click **"Compare & pull request"**
   - Fill in the PR form:
     - **Title**: Brief summary (e.g., "Add voice input support")
     - **Description**: Explain your changes clearly:
       - What changes you made
       - Why you made them
       - Screenshots (if UI changes)
       - Related issue numbers (e.g., "Fixes #42")
   - Click **"Create pull request"**
   - Wait for review and be responsive to feedback

---

## 👨‍💻 Author

**Maurya Ji**
- LinkedIn: [your-linkedin-url](https://www.linkedin.com/in/ravibhushan-kumar)
- Portfolio: [your-portfolio-url](https://ravibhushan-portfolio.vercel.app)
- GitHub: [@your-username](https://github.com/ravibhushan10)
- Email: ravibhushankumar87tp@gmail.com

---

<div align="center">

### ⭐ Star this repository if it helped you!

**Made with ❤️ by Ravi Bhushan**

[Live Demo](https://nexus-three-mauve.vercel.app) · [Report Bug](https://github.com/ravibhushan10/NexusAI/issues) · [Request Feature](https://github.com/ravibhushan10/NexusAI/issues)

</div>

---
