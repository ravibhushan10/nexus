const express    = require('express')
const router     = express.Router()
const nodemailer = require('nodemailer')

function getTransport() {
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host:   'smtp.resend.com',
      port:   465,
      secure: true,
      auth:   { user: 'resend', pass: process.env.RESEND_API_KEY },
    })
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth:    { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    })
  }
  return null
}

function getFrom() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM
  if (process.env.GMAIL_USER) return `NexusAI <${process.env.GMAIL_USER}>`
  return 'NexusAI <noreply@codeforgeai.in>'
}

router.post('/contact', async (req, res) => {
  const { name, email, category, subject, message } = req.body

  if (!name || !email || !subject || !message)
    return res.status(400).json({ message: 'All fields are required' })

  const transport = getTransport()
  if (!transport) {
    console.error('No email transport configured')
    return res.status(500).json({ message: 'Email service not configured' })
  }

  try {
    await transport.sendMail({
      from:    getFrom(),
      to:      process.env.SUPPORT_EMAIL,
      replyTo: email,
      subject: `[${category || 'General'}] ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f1a;color:#fff;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#9d6fff,#6e3fff);padding:24px 28px">
            <h2 style="margin:0;font-size:1.2rem">📩 New Support Request</h2>
            <p style="margin:4px 0 0;opacity:0.85;font-size:0.85rem">NexusAI Help Center</p>
          </div>
          <div style="padding:28px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#aaa;width:100px">Name</td><td style="color:#fff;font-weight:600">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#aaa">Email</td><td><a href="mailto:${email}" style="color:#9d6fff">${email}</a></td></tr>
              <tr><td style="padding:8px 0;color:#aaa">Category</td><td style="color:#fff">${category || 'General'}</td></tr>
              <tr><td style="padding:8px 0;color:#aaa">Subject</td><td style="color:#fff;font-weight:600">${subject}</td></tr>
            </table>
            <div style="margin-top:20px;background:#1a1a2e;border-radius:8px;padding:16px;border-left:3px solid #9d6fff">
              <p style="margin:0 0 8px;color:#aaa;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em">Message</p>
              <p style="margin:0;color:#e0e0e0;line-height:1.7">${message.replace(/\n/g, '<br/>')}</p>
            </div>
            <p style="margin-top:20px;font-size:0.78rem;color:#666">Reply directly to this email to respond to ${name}.</p>
          </div>
        </div>
      `,
    })

    res.json({ message: 'Message sent successfully' })
  } catch (err) {
    console.error('Email error:', err.message)
    res.status(500).json({ message: 'Failed to send message' })
  }
})

module.exports = router
