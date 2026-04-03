const express  = require('express')
const router   = express.Router()
const jwt      = require('jsonwebtoken')
const crypto   = require('crypto')
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const User     = require('../models/User')
const { protect } = require('../middleware/auth')
const {
  sendVerificationOTP,
  sendPasswordResetOTP,
  sendWelcomeEmail,
} = require('../utils/sendEmail')

// ── Constants ──────────────────────────────────────────────────────────────
const OTP_EXPIRY_MS   = 2 * 60 * 1000        // 2 minutes
const OTP_MAX_ATTEMPTS = 2                    // lock after 2nd wrong attempt
const OTP_LOCK_MS      = 15 * 60 * 1000      // 15-minute lockout

// ── Multer — avatar uploads ────────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/avatars')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `avatar_${req.user._id}_${Date.now()}${ext}`)
  },
})
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'))
    cb(null, true)
  },
})

const genOTP = () => String(Math.floor(100000 + Math.random() * 900000))

const _sanitise = (user) => ({
  id:              user._id,
  name:            user.name,
  email:           user.email,
  plan:            user.plan,
  avatar:          user.avatar,
  isVerified:      user.isVerified,
  oauthProvider:   user.oauthProvider,
  systemPrompt:    user.systemPrompt,
  language:        user.language,
  usage:           user.usage,
  memory:          user.memory,
  promptTemplates: user.promptTemplates,
})

// ── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ message: 'All fields are required' })
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' })

    const exists = await User.findOne({ email: email.toLowerCase() })

    // Email belongs to an OAuth-only account
    if (exists && exists.oauthProvider && !exists.password) {
      return res.status(400).json({
        message: `This email is already linked to a ${exists.oauthProvider === 'google' ? 'Google' : 'GitHub'} account. Please sign in with that instead.`,
        code:     'USE_OAUTH',
        provider: exists.oauthProvider,
      })
    }

    // Unverified normal account — resend fresh OTP
    if (exists && !exists.isVerified) {
      const otp = genOTP()
      // Use $set to avoid touching password and triggering the hash hook
      await User.findByIdAndUpdate(exists._id, {
        $set: {
          verifyOtp:            otp,
          verifyOtpExpiry:      new Date(Date.now() + OTP_EXPIRY_MS),
          verifyOtpCount:       0,
          verifyOtpLockedUntil: null,
        },
      })
      sendVerificationOTP(email, name, otp).catch(e => console.warn('Email error:', e.message))
      return res.status(200).json({ code: 'VERIFY_OTP', message: 'OTP sent to your email' })
    }

    if (exists) return res.status(400).json({ message: 'Email already registered', code: 'EMAIL_TAKEN' })

    const otp  = genOTP()
    const user = new User({
      name:            name.trim(),
      email:           email.toLowerCase(),
      password,
      isVerified:      false,
      verifyOtp:       otp,
      verifyOtpExpiry: new Date(Date.now() + OTP_EXPIRY_MS),
    })
    await user.save()
    sendVerificationOTP(email, name.trim(), otp).catch(e => console.warn('Email error:', e.message))
    res.status(201).json({ code: 'VERIFY_OTP', message: 'OTP sent to your email' })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (user.isVerifyOtpLocked())
      return res.status(429).json({ message: 'Too many wrong attempts. Try again in 15 minutes.', code: 'OTP_LOCKED' })

    if (!user.verifyOtpExpiry || user.verifyOtpExpiry < new Date())
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.', code: 'OTP_EXPIRED' })

    if (user.verifyOtp !== otp) {
      const newCount = (user.verifyOtpCount || 0) + 1
      const locked   = newCount >= OTP_MAX_ATTEMPTS
      // Use $set so the pre-save hook never sees `password` as modified
      await User.findByIdAndUpdate(user._id, {
        $set: {
          verifyOtpCount:       newCount,
          verifyOtpLockedUntil: locked ? new Date(Date.now() + OTP_LOCK_MS) : null,
        },
      })
      if (locked) {
        return res.status(429).json({
          message: 'Too many wrong attempts. Try again in 15 minutes.',
          code:    'OTP_LOCKED',
        })
      }
      const left = OTP_MAX_ATTEMPTS - newCount
      return res.status(400).json({
        message: `Wrong OTP. ${left} attempt${left === 1 ? '' : 's'} remaining.`,
        code:    'INVALID_OTP',
      })
    }

    // OTP correct — mark verified and issue tokens
    const accessToken  = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    await User.findByIdAndUpdate(user._id, {
      $set: {
        isVerified:           true,
        verifyOtp:            '',
        verifyOtpExpiry:      null,
        verifyOtpCount:       0,
        verifyOtpLockedUntil: null,
        refreshToken,
      },
    })

    sendWelcomeEmail(user.email, user.name).catch(() => {})
    res.json({ accessToken, refreshToken, user: _sanitise({ ...user.toObject(), isVerified: true }) })
  } catch (err) {
    console.error('Verify OTP error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email required' })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user)           return res.status(404).json({ message: 'User not found' })
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' })

    const otp = genOTP()
    await User.findByIdAndUpdate(user._id, {
      $set: {
        verifyOtp:            otp,
        verifyOtpExpiry:      new Date(Date.now() + OTP_EXPIRY_MS),
        verifyOtpCount:       0,
        verifyOtpLockedUntil: null,
      },
    })
    sendVerificationOTP(user.email, user.name, otp).catch(e => console.warn('Email error:', e.message))
    res.json({ message: 'OTP resent successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    // OAuth-only account — no password set
    if (user.oauthProvider && !user.password) {
      return res.status(401).json({
        message:  `This account was created with ${user.oauthProvider === 'google' ? 'Google' : 'GitHub'}. Please sign in using that instead.`,
        code:     'USE_OAUTH',
        provider: user.oauthProvider,
      })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' })

    // Registered but not verified — resend OTP
    if (!user.isVerified) {
      const otp = genOTP()
      await User.findByIdAndUpdate(user._id, {
        $set: {
          verifyOtp:            otp,
          verifyOtpExpiry:      new Date(Date.now() + OTP_EXPIRY_MS),
          verifyOtpCount:       0,
          verifyOtpLockedUntil: null,
        },
      })
      sendVerificationOTP(user.email, user.name, otp).catch(e => console.warn('Email error:', e.message))
      return res.status(403).json({
        message: 'Email not verified. A new code has been sent.',
        code:    'EMAIL_NOT_VERIFIED',
        email:   user.email,
      })
    }

    const accessToken  = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    await User.findByIdAndUpdate(user._id, { $set: { refreshToken } })

    res.json({ accessToken, refreshToken, user: _sanitise(user) })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/forgot-password ────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email required' })

    const user = await User.findOne({ email: email.toLowerCase() })

    // Generic response to prevent email enumeration
    if (!user) return res.json({ message: 'If this email exists, an OTP has been sent.' })

    // OAuth-only account has no password to reset
    if (user.oauthProvider && !user.password) {
      return res.status(400).json({
        message:  `This account uses ${user.oauthProvider === 'google' ? 'Google' : 'GitHub'} sign-in and has no password to reset.`,
        code:     'USE_OAUTH',
        provider: user.oauthProvider,
      })
    }

    const otp = genOTP()
    await User.findByIdAndUpdate(user._id, {
      $set: {
        resetOtp:            otp,
        resetOtpExpiry:      new Date(Date.now() + OTP_EXPIRY_MS),
        resetOtpCount:       0,
        resetOtpLockedUntil: null,
      },
    })
    sendPasswordResetOTP(user.email, user.name, otp).catch(e => console.warn('Email error:', e.message))
    res.json({ message: 'OTP sent to your email' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/verify-reset-otp ──────────────────────────────────────
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (user.isResetOtpLocked())
      return res.status(429).json({ message: 'Too many wrong attempts. Try again in 15 minutes.', code: 'OTP_LOCKED' })

    if (!user.resetOtpExpiry || user.resetOtpExpiry < new Date())
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.', code: 'OTP_EXPIRED' })

    if (user.resetOtp !== otp) {
      const newCount = (user.resetOtpCount || 0) + 1
      const locked   = newCount >= OTP_MAX_ATTEMPTS
      await User.findByIdAndUpdate(user._id, {
        $set: {
          resetOtpCount:       newCount,
          resetOtpLockedUntil: locked ? new Date(Date.now() + OTP_LOCK_MS) : null,
        },
      })
      if (locked) {
        return res.status(429).json({
          message: 'Too many wrong attempts. Try again in 15 minutes.',
          code:    'OTP_LOCKED',
        })
      }
      const left = OTP_MAX_ATTEMPTS - newCount
      return res.status(400).json({
        message: `Wrong OTP. ${left} attempt${left === 1 ? '' : 's'} remaining.`,
        code:    'INVALID_OTP',
      })
    }

    // OTP correct — issue a 15-min reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    await User.findByIdAndUpdate(user._id, {
      $set: {
        resetToken,
        resetTokenExpiry:    new Date(Date.now() + 15 * 60 * 1000),
        resetOtp:            '',
        resetOtpExpiry:      null,
        resetOtpCount:       0,
        resetOtpLockedUntil: null,
      },
    })
    res.json({ resetToken })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/reset-password ─────────────────────────────────────────
// FIX: was using user.save() which caused pre-save hook to double-hash the
// already-in-memory plain password IF resetToken/expiry cleared simultaneously.
// Now we hash explicitly and use $set to be 100% safe.
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body
    if (!email || !resetToken || !newPassword)
      return res.status(400).json({ message: 'All fields required' })
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (
      !user.resetToken ||
      user.resetToken !== resetToken ||
      !user.resetTokenExpiry ||
      user.resetTokenExpiry < new Date()
    ) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Please start over.' })
    }

    // Hash manually here — bypassing pre-save hook entirely is the safest approach
    const bcrypt = require('bcryptjs')
    const hashed = await bcrypt.hash(newPassword, 12)

    await User.findByIdAndUpdate(user._id, {
      $set: {
        password:         hashed,
        resetToken:       '',
        resetTokenExpiry: null,
        resetOtpCount:    0,
        // Invalidate any active refresh tokens so old sessions can't be reused
        refreshToken:     '',
      },
    })

    res.json({ message: 'Password reset successfully. Please sign in.' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/oauth ──────────────────────────────────────────────────
// FIX: no longer silently merges when email has a password account.
// Returns specific codes so the frontend can show the right action.
router.post('/oauth', async (req, res) => {
  try {
    const { name, email, oauthProvider, oauthId, avatar } = req.body
    if (!email || !oauthProvider || !oauthId)
      return res.status(400).json({ message: 'Missing OAuth fields' })

    let user = await User.findOne({ email: email.toLowerCase() })

    if (user) {
      // Email already registered with a password — block the OAuth merge
      if (user.password && !user.oauthProvider) {
        return res.status(409).json({
          message: 'This email is already registered with a password. Please sign in with your email and password instead.',
          code:    'OAUTH_EMAIL_CONFLICT',
        })
      }

      // Same email but different OAuth provider
      if (user.oauthProvider && user.oauthProvider !== oauthProvider) {
        return res.status(409).json({
          message:  `This email is already linked to ${user.oauthProvider === 'google' ? 'Google' : 'GitHub'}. Please use that to sign in.`,
          code:     'USE_OAUTH',
          provider: user.oauthProvider,
        })
      }

      // Returning OAuth user — update avatar if missing, ensure verified
      await User.findByIdAndUpdate(user._id, {
        $set: {
          isVerified: true,
          ...(avatar && !user.avatar ? { avatar } : {}),
        },
      })
      user = await User.findById(user._id)
    } else {
      // Brand-new OAuth user
      user = await User.create({
        name:          name || email.split('@')[0],
        email:         email.toLowerCase(),
        oauthProvider, oauthId,
        avatar:        avatar || '',
        isVerified:    true,
        password:      '',
      })
      sendWelcomeEmail(user.email, user.name).catch(() => {})
    }

    const accessToken  = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    await User.findByIdAndUpdate(user._id, { $set: { refreshToken } })

    res.json({ accessToken, refreshToken, user: _sanitise(user) })
  } catch (err) {
    console.error('OAuth error:', err)
    res.status(500).json({ message: 'OAuth sign-in failed' })
  }
})

// ── POST /api/auth/refresh ────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' })

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user    = await User.findById(decoded.id)

    if (!user || user.refreshToken !== refreshToken)
      return res.status(401).json({ message: 'Invalid refresh token' })

    const newAccessToken  = user.generateAccessToken()
    const newRefreshToken = user.generateRefreshToken()
    await User.findByIdAndUpdate(user._id, { $set: { refreshToken: newRefreshToken } })

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired refresh token' })
  }
})

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: '' } })
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken')
  res.json({ user: _sanitise(user) })
})

// ── PUT /api/auth/profile ──────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ message: 'Name cannot be empty' })
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name: name.trim() } },
      { new: true }
    )
    res.json({ user: _sanitise(user) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/avatar ─────────────────────────────────────────────────
router.post('/avatar', protect, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' })
    const user = await User.findById(req.user._id)
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '..', user.avatar)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar: `/uploads/avatars/${req.file.filename}` } },
      { new: true }
    )
    res.json({ avatar: updated.avatar, user: _sanitise(updated) })
  } catch (err) {
    console.error('Avatar upload error:', err)
    res.status(500).json({ message: 'Upload failed' })
  }
})

// ── PUT /api/auth/change-password ──────────────────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both fields required' })
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' })

    const user    = await User.findById(req.user._id)
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' })

    // Hash and save safely
    const bcrypt = require('bcryptjs')
    const hashed = await bcrypt.hash(newPassword, 12)
    await User.findByIdAndUpdate(req.user._id, { $set: { password: hashed } })

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/auth/system-prompt ────────────────────────────────────────────
router.put('/system-prompt', protect, async (req, res) => {
  try {
    const { systemPrompt } = req.body
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { systemPrompt: systemPrompt?.trim() || '' } },
      { new: true }
    )
    res.json({ systemPrompt: user.systemPrompt, user: _sanitise(user) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/auth/language ─────────────────────────────────────────────────
router.put('/language', protect, async (req, res) => {
  try {
    const { language } = req.body
    if (!['en', 'hi'].includes(language))
      return res.status(400).json({ message: 'Invalid language' })
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { language } },
      { new: true }
    )
    res.json({ language: user.language, user: _sanitise(user) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── DELETE /api/auth/account ───────────────────────────────────────────────
router.delete('/account', protect, async (req, res) => {
  try {
    const userId       = req.user._id
    const Conversation = require('../models/Conversation')
    const Payment      = require('../models/Payment')
    await Promise.all([
      Conversation.deleteMany({ userId }),
      Payment.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ])
    res.json({ message: 'Account deleted successfully' })
  } catch (err) {
    console.error('Delete account error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
