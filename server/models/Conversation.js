const mongoose = require('mongoose')
const crypto   = require('crypto')

const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  type:    { type: String, enum: ['text', 'voice', 'rag'], default: 'text' },
  sources: [{
    documentId:   String,
    documentName: String,
    chunk:        String,
    score:        Number,
  }],
  tokens: { type: Number, default: 0 },
  cost:   { type: Number, default: 0 },
}, { timestamps: true })

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:  { type: String, default: 'New Conversation' },
  model:  { type: String, default: 'llama3-8b-8192' },
  systemPrompt: { type: String, default: '' },
  messages: [messageSchema],
  features: {
    ragEnabled:    { type: Boolean, default: false },
    memoryEnabled: { type: Boolean, default: true },
  },
  totalTokens: { type: Number, default: 0 },
  totalCost:   { type: Number, default: 0 },
  isPinned:    { type: Boolean, default: false },
  isDeleted:   { type: Boolean, default: false },
  folder:      { type: String, default: '' },

  // ── Share fields ────────────────────────────────────────────────────────
  isPublic:   { type: Boolean, default: false },
  shareToken: { type: String,  default: null, index: true, sparse: true },

}, { timestamps: true })

conversationSchema.methods.generateTitle = function () {
  const firstUser = this.messages.find(m => m.role === 'user')
  if (firstUser) {
    this.title = firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? '…' : '')
  }
}

// Generate a cryptographically random share token
conversationSchema.methods.generateShareToken = function () {
  this.shareToken = crypto.randomBytes(24).toString('hex')
  this.isPublic   = true
  return this.shareToken
}

module.exports = mongoose.model('Conversation', conversationSchema)
