const nodemailer = require('nodemailer')

// ── DEV MODE: logs OTP to console instead of sending email ────────────────────
// Set EMAIL_DEV_MODE=true in .env to skip email entirely during development
const DEV_MODE = process.env.EMAIL_DEV_MODE === 'true'

// ── Transport factory ─────────────────────────────────────────────────────────
// Priority: Resend (production) → Gmail (development) → console fallback
function getTransport() {
  // Option 1: Resend — production, needs a verified domain at resend.com/domains
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host:   'smtp.resend.com',
      port:   465,
      secure: true,
      auth:   { user: 'resend', pass: process.env.RESEND_API_KEY },
    })
  }

  // Option 2: Gmail — development, requires an App Password (NOT your real password)
  // How to get: Google Account → Security → 2-Step Verification → App passwords → Create
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   587,
      secure: false,
      auth:   { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      tls:    { rejectUnauthorized: false },
    })
  }

  // Option 3: No config — will fall through to console logging
  return null
}

// ── FROM address ──────────────────────────────────────────────────────────────
// - Gmail:  must be your Gmail address  →  NexusAI <yourname@gmail.com>
// - Resend: must match your verified domain → NexusAI <noreply@yourdomain.com>
function getFrom() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM
  if (process.env.GMAIL_USER) return `NexusAI <${process.env.GMAIL_USER}>`
  return 'NexusAI <noreply@nexusai.app>'
}

// ── Safe send ─────────────────────────────────────────────────────────────────
async function safeSend(mailOptions, label, otp) {
  const transport = getTransport()

  try {
    await transport.sendMail({ ...mailOptions, from: getFrom() })
    console.log(`[EMAIL] ${label} sent to ${mailOptions.to}`)
  } catch (err) {
    console.error(`[EMAIL] FULL ERROR:`, JSON.stringify(err, null, 2)) // ← change this line
    throw err
  }
  // Console fallback: DEV_MODE enabled OR no transport configured
  if (DEV_MODE || !transport) {
    console.log(`\n[EMAIL ${DEV_MODE ? 'DEV MODE' : 'NO CONFIG'}] ${label}`)
    console.log(`   To:      ${mailOptions.to}`)
    if (otp) console.log(`   OTP:     \x1b[33m${otp}\x1b[0m  ← use this code`)
    console.log(`   Subject: ${mailOptions.subject}\n`)
    return
  }

  try {
    await transport.sendMail({ ...mailOptions, from: getFrom() })
    console.log(`[EMAIL] ${label} sent to ${mailOptions.to}`)
  } catch (err) {
    // Log error but don't crash the request — caller already uses .catch()
    console.error(`[EMAIL] Failed to send ${label} to ${mailOptions.to}:`, err.message)
    throw err
  }
}

// ── Email templates ───────────────────────────────────────────────────────────
const base = (content) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080810;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#13131e;border:1px solid #252535;border-radius:16px;padding:36px 32px;">
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:32px;">
        <span style="color:#eaeaf8;font-size:18px;font-weight:700;">NexusAI</span>
      </div>
      ${content}
      <hr style="border:none;border-top:1px solid #252535;margin:24px 0;">
      <p style="color:#50506a;font-size:12px;line-height:1.6;margin:0;">You received this email because you have an active NexusAI account.</p>
    </div>
  </div>
</body></html>`

const otpBox = (otp, label) => `
  <div style="background:#0e0e18;border:1px solid #323248;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
    <div style="font-size:40px;font-weight:800;letter-spacing:14px;color:#9d6fff;font-family:monospace;">${otp}</div>
    <p style="color:#50506a;font-size:12px;margin:8px 0 0;">${label}</p>
  </div>`

// ── Email senders ─────────────────────────────────────────────────────────────
async function sendVerificationOTP(email, name, otp) {
  await safeSend({
    to:      email,
    subject: `${otp} is your NexusAI verification code`,
    html: base(`
      <h1 style="color:#eaeaf8;font-size:22px;font-weight:700;margin:0 0 8px;">Verify your email</h1>
      <p style="color:#8080a8;font-size:14px;margin:0 0 28px;line-height:1.5;">
        Hi ${name}, enter this code to activate your NexusAI account.
        Expires in <strong style="color:#eaeaf8">10 minutes</strong>.
      </p>
      ${otpBox(otp, 'One-time verification code')}
      <p style="color:#50506a;font-size:13px;margin:0;">If you didn't create an account, ignore this email.</p>
    `),
  }, 'Verification OTP', otp)
}

async function sendPasswordResetOTP(email, name, otp) {
  await safeSend({
    to:      email,
    subject: `${otp} is your NexusAI password reset code`,
    html: base(`
      <h1 style="color:#eaeaf8;font-size:22px;font-weight:700;margin:0 0 8px;">Reset your password</h1>
      <p style="color:#8080a8;font-size:14px;margin:0 0 28px;line-height:1.5;">
        Hi ${name}, use this code to reset your password.
        Expires in <strong style="color:#eaeaf8">10 minutes</strong>.
      </p>
      ${otpBox(otp, 'Password reset code')}
      <div style="background:rgba(255,92,92,0.08);border:1px solid rgba(255,92,92,0.25);border-radius:10px;padding:14px 18px;color:#ff5c5c;font-size:13px;">
        If you didn't request this, please secure your account immediately.
      </div>
    `),
  }, 'Password Reset OTP', otp)
}

async function sendLimitReachedEmail(email, name, plan, limit) {
  const isFree = plan === 'free'
  await safeSend({
    to:      email,
    subject: `You've reached your NexusAI daily limit`,
    html: base(`
      <h1 style="color:#eaeaf8;font-size:22px;font-weight:700;margin:0 0 8px;">Daily limit reached</h1>
      <p style="color:#8080a8;font-size:14px;margin:0 0 20px;line-height:1.5;">
        Hi ${name}, you've used all <strong style="color:#eaeaf8">${limit} messages</strong>
        on your ${isFree ? 'Free' : 'Pro'} plan today.
      </p>
      <div style="background:rgba(157,111,255,0.08);border:1px solid rgba(157,111,255,0.25);border-radius:10px;padding:14px 18px;color:#9d6fff;font-size:13px;margin:0 0 20px;">
         Your limit resets at midnight every day. Come back tomorrow to continue!
      </div>
      ${isFree ? `
        <p style="color:#8080a8;font-size:14px;margin:0 0 20px;">
          Upgrade to <strong style="color:#9d6fff">NexusAI Pro</strong> for 500 messages/day and advanced models.
        </p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/upgrade"
          style="display:inline-block;background:linear-gradient(135deg,#9d6fff,#6b3fd4);color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
          Upgrade to Pro →
        </a>
      ` : ''}
    `),
  }, 'Limit Reached')
}

async function sendWelcomeEmail(email, name) {
  await safeSend({
    to:      email,
    subject: `Welcome to NexusAI, ${name}!`,
    html: base(`
      <h1 style="color:#eaeaf8;font-size:22px;font-weight:700;margin:0 0 8px;">Welcome to NexusAI! 🎉</h1>
      <p style="color:#8080a8;font-size:14px;margin:0 0 24px;line-height:1.5;">
        Hi ${name}, your account is verified. Start chatting with our AI models
        powered by Groq's ultra-fast inference.
      </p>
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/chat"
        style="display:inline-block;background:linear-gradient(135deg,#9d6fff,#6b3fd4);color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin:0 0 24px;">
        Start Chatting →
      </a>
      <div style="background:rgba(0,208,132,0.08);border:1px solid rgba(0,208,132,0.25);border-radius:10px;padding:14px 18px;color:#00d084;font-size:13px;">
        Free plan: 20 messages/day. Upgrade to Pro for 500 messages and priority access.
      </div>
    `),
  }, 'Welcome Email')
}

module.exports = {
  sendVerificationOTP,
  sendPasswordResetOTP,
  sendLimitReachedEmail,
  sendWelcomeEmail,
}
