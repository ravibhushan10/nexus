const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: '' },
  plan:     { type: String, enum: ['free', 'pro'], default: 'free' },
  avatar:   { type: String, default: '' },

  // ── Auth ───────────────────────────────────────────────────────────────
  isVerified:    { type: Boolean, default: false },
  oauthProvider: { type: String, default: '' },   // 'google' | 'github' | ''
  oauthId:       { type: String, default: '' },

  // OTP — email verification (register)
  // Policy: expires in 2 minutes, locks after 2 wrong attempts (3rd = locked)
  verifyOtp:            { type: String, default: '' },
  verifyOtpExpiry:      { type: Date,   default: null },
  verifyOtpCount:       { type: Number, default: 0 },
  verifyOtpLockedUntil: { type: Date,   default: null },

  // OTP — password reset
  // Same policy: 2 minutes expiry, 2 attempts before lock
  resetOtp:            { type: String, default: '' },
  resetOtpExpiry:      { type: Date,   default: null },
  resetOtpCount:       { type: Number, default: 0 },
  resetOtpLockedUntil: { type: Date,   default: null },

  // Reset token — short-lived token issued after OTP is verified
  resetToken:       { type: String, default: '' },
  resetTokenExpiry: { type: Date,   default: null },

  // ── Preferences ────────────────────────────────────────────────────────
  systemPrompt: { type: String, default: '' },
  language:     { type: String, enum: ['en', 'hi'], default: 'en' },

  // ── Usage ──────────────────────────────────────────────────────────────
  usage: {
    messagesToday:   { type: Number, default: 0 },
    totalMessages:   { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 },
    totalCost:       { type: Number, default: 0 },
    lastResetDate:   { type: Date,   default: Date.now },
  },

  // ── Payments ───────────────────────────────────────────────────────────
  razorpay: {
    customerId:     { type: String, default: '' },
    subscriptionId: { type: String, default: '' },
    paymentId:      { type: String, default: '' },
  },

  // ── Memory & Templates ─────────────────────────────────────────────────
  memory: [{
    key:       String,
    value:     String,
    createdAt: { type: Date, default: Date.now },
  }],

  promptTemplates: [{
    title:     { type: String, required: true },
    content:   { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],

  refreshToken:       { type: String, default: '' },
  limitEmailSentDate: { type: Date,   default: null },

}, { timestamps: true })

// ── Hash password ─────────────────────────────────────────────────────────
// CRITICAL: Only hashes when `password` field is actually modified.
// This means routes that update OTHER fields (resetToken, OTP, etc.) must use
// findByIdAndUpdate({ $set: {...} }) instead of user.save() to avoid
// accidentally double-hashing an already-hashed password.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// ── Reset daily count if new day ──────────────────────────────────────────
userSchema.methods.resetDailyIfNeeded = function () {
  const now  = new Date()
  const last = new Date(this.usage.lastResetDate)
  if (now.toDateString() !== last.toDateString()) {
    this.usage.messagesToday = 0
    this.usage.lastResetDate = now
    this.limitEmailSentDate  = null
  }
}

userSchema.methods.comparePassword = async function (password) {
  if (!this.password) return false
  return bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ id: this._id, plan: this.plan }, process.env.JWT_SECRET, { expiresIn: '15m' })
}

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

userSchema.methods.canSendMessage = function () {
  this.resetDailyIfNeeded()
  const limit = this.plan === 'pro' ? 500 : 20
  return this.usage.messagesToday < limit
}

userSchema.methods.getDailyLimit = function () {
  return this.plan === 'pro' ? 500 : 20
}

userSchema.methods.shouldSendLimitEmail = function () {
  if (!this.limitEmailSentDate) return true
  return new Date(this.limitEmailSentDate).toDateString() !== new Date().toDateString()
}

// Lock check helpers
userSchema.methods.isVerifyOtpLocked = function () {
  return !!(this.verifyOtpLockedUntil && this.verifyOtpLockedUntil > new Date())
}
userSchema.methods.isResetOtpLocked = function () {
  return !!(this.resetOtpLockedUntil && this.resetOtpLockedUntil > new Date())
}

module.exports = mongoose.model('User', userSchema)
