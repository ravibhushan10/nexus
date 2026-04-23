require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const mongoose  = require('mongoose')
const rateLimit = require('express-rate-limit')
const path      = require('path')
const logger    = require('./utils/logger')



const app = express()
app.set('trust proxy', 1)

app.use(logger.request)

app.use(cors({
  origin:         process.env.CLIENT_URL || 'http://localhost:5173',
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      300,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { message: 'Too many requests — please try again later.' },
  skip: (req) => req.path === '/api/health',
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      15,
  message:  { message: 'Too many auth attempts — try again in 15 minutes.' },
})

app.use('/api/',              globalLimiter)
app.use('/api/auth/login',    authLimiter)
app.use('/api/auth/register', authLimiter)

app.use('/api/auth',          require('./routes/auth'))
app.use('/api/chat',          require('./routes/chat'))
const Conversation = require('./models/Conversation')

app.get('/api/share/:shareToken', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      shareToken: req.params.shareToken,
      isPublic:   true,
      isDeleted:  false,
    }).select('title messages createdAt updatedAt')

    if (!conversation) return res.status(404).json({ message: 'Conversation not found or link disabled.' })

    res.json({
      conversation: {
        _id:       conversation._id,
        title:     conversation.title,
        messages:  conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      }
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})
app.use('/api/conversations', require('./routes/conversations'))
app.use('/api/payment',       require('./routes/payment'))
app.use('/api/analytics',     require('./routes/analytics'))
app.use('/api/support',       require('./routes/support'))

app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version:   '2.0.0',
    env:       process.env.NODE_ENV || 'development',
    mongo:     mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    groq:      process.env.GROQ_API_KEY ? 'configured' : 'missing',
  })
})

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` })
})

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message)
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
})




const PORT = process.env.PORT || 5000

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          45000,
})
.then(() => {
  logger.success('MongoDB connected')
  app.listen(PORT, () => {
    logger.success(`Server running → http://localhost:${PORT}`)
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
    if (!process.env.GROQ_API_KEY)    logger.warn('GROQ_API_KEY not set — chat will fail!')
    if (!process.env.RAZORPAY_KEY_ID) logger.warn('RAZORPAY keys not set — payments disabled')
    if (!process.env.RESEND_API_KEY && !process.env.GMAIL_USER)
      logger.warn('No email config — OTP emails will fail! Set RESEND_API_KEY or GMAIL_USER+GMAIL_PASS')
  })
})
.catch(err => {
  logger.error('MongoDB connection failed:', err.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => logger.error('UnhandledRejection:', reason))
process.on('uncaughtException',  (err)    => { logger.error('UncaughtException:', err); process.exit(1) })

module.exports = app
