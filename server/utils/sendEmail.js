
const DEV_MODE = process.env.EMAIL_DEV_MODE === 'true'

async function safeSend(mailOptions, label, otp) {
  if (DEV_MODE) {
    console.log(`\n[EMAIL DEV MODE] ${label}`)
    console.log(`   To:      ${mailOptions.to}`)
    if (otp) console.log(`   OTP:     \x1b[33m${otp}\x1b[0m  ← use this code`)
    console.log(`   Subject: ${mailOptions.subject}\n`)
    return
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn(`[EMAIL] RESEND_API_KEY not set — skipping ${label}`)
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     process.env.EMAIL_FROM || 'NexusAI <nexus@codeforgeai.in>',
        to:       [mailOptions.to],
        subject:  mailOptions.subject,
        html:     mailOptions.html,
        ...(mailOptions.replyTo && { reply_to: mailOptions.replyTo }),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error(`[EMAIL] Resend API error:`, JSON.stringify(data, null, 2))
      throw new Error(data.message || 'Resend API failed')
    }

    console.log(`[EMAIL] ${label} sent to ${mailOptions.to} — id: ${data.id}`)
  } catch (err) {
    console.error(`[EMAIL] Failed to send ${label} to ${mailOptions.to}:`, err.message)
    throw err
  }
}

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

async function sendSupportEmail({ name, email, category, subject, message }) {
  await safeSend({
    to:      process.env.SUPPORT_EMAIL,
    replyTo: email,
    subject: `[${category || 'General'}] ${subject}`,
    html: base(`
      <h1 style="color:#eaeaf8;font-size:22px;font-weight:700;margin:0 0 8px;">New Support Request</h1>
      <p style="color:#8080a8;font-size:14px;margin:0 0 20px;">
        From: <strong style="color:#eaeaf8">${name}</strong> &lt;${email}&gt;
      </p>
      <div style="background:#0e0e18;border:1px solid #323248;border-radius:12px;padding:20px;margin:0 0 16px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#50506a;font-size:13px;padding:6px 0;width:90px;">Category</td>
            <td style="color:#eaeaf8;font-size:13px;font-weight:600;">${category || 'General'}</td>
          </tr>
          <tr>
            <td style="color:#50506a;font-size:13px;padding:6px 0;">Subject</td>
            <td style="color:#eaeaf8;font-size:13px;font-weight:600;">${subject}</td>
          </tr>
        </table>
      </div>
      <div style="background:#0e0e18;border:1px solid #323248;border-radius:12px;padding:20px;">
        <p style="color:#50506a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">Message</p>
        <p style="color:#eaeaf8;font-size:14px;line-height:1.7;margin:0;">${message.replace(/\n/g, '<br/>')}</p>
      </div>
      <p style="color:#50506a;font-size:12px;margin:16px 0 0;">Reply to this email to respond directly to ${name}.</p>
    `),
  }, 'Support Email')
}

module.exports = {
  sendVerificationOTP,
  sendPasswordResetOTP,
  sendLimitReachedEmail,
  sendWelcomeEmail,
  sendSupportEmail,
}
