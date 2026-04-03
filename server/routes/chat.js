const express      = require('express')
const router       = express.Router()
const Groq         = require('groq-sdk')
const { protect }  = require('../middleware/auth')
const Conversation = require('../models/Conversation')
const User         = require('../models/User')
const { estimateCost } = require('../utils/cost')
const { sendLimitReachedEmail } = require('../utils/sendEmail')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ── Model lists ───────────────────────────────────────────────────────────────
const FREE_MODELS        = ['llama-3.1-8b-instant', 'gemma2-9b-it', 'qwen/qwen3-32b']
const PRO_MODELS         = ['llama-3.3-70b-versatile']
const ALL_MODELS         = [...FREE_MODELS, ...PRO_MODELS]
const DEFAULT_FREE_MODEL = 'llama-3.1-8b-instant'
const DEFAULT_PRO_MODEL  = 'llama-3.3-70b-versatile'

// Free Groq vision model — auto-selected when user attaches images
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

const DEFAULT_SYSTEM = `You are NexusAI, a highly capable AI assistant powered by Groq's ultra-fast inference engine. Be helpful, accurate, and concise. Format responses using clean markdown when appropriate — use code blocks for code, bullet points for lists, and headers for long structured responses.`

// ─── Always return a plain string — fixes the 400 "content must be a string" ──
function normaliseToString(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.filter(b => b.type === 'text').map(b => b.text || '').join(' ').trim()
  }
  return String(content ?? '')
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/send
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send', protect, async (req, res) => {
  try {
    const {
      message,
      conversationId,
      memoryEnabled = true,
      systemPrompt  = '',
      model: requestedModel,
      images = [],  // [{ mimeType: 'image/png', data: '<base64 string>' }]
      docs   = [],  // [{ name: 'report.pdf',   text: '<extracted plain text>' }]
    } = req.body

    if (!message?.trim())
      return res.status(400).json({ message: 'Message is required' })

    const user = await User.findById(req.user._id)

    if (!user.canSendMessage()) {
      sendLimitReachedEmail(user.email, user.name, user.plan, user.getDailyLimit()).catch(() => {})
      return res.status(429).json({
        message: `Daily limit reached. ${user.plan === 'free'
          ? 'Free plan: 20 msgs/day. Upgrade to Pro for 500.'
          : 'Pro plan: 500 msgs/day.'}`,
        code: 'LIMIT_REACHED',
      })
    }

    // ── Model selection ───────────────────────────────────────────────────────
    // Images present → auto-switch to vision model (free, no plan check needed)
    // Otherwise → honour requested model with plan enforcement
    let selectedModel
    if (images.length > 0) {
      selectedModel = VISION_MODEL
    } else if (requestedModel && ALL_MODELS.includes(requestedModel)) {
      if (PRO_MODELS.includes(requestedModel) && user.plan !== 'pro') {
        selectedModel = DEFAULT_FREE_MODEL
      } else {
        selectedModel = requestedModel
      }
    } else {
      selectedModel = user.plan === 'pro' ? DEFAULT_PRO_MODEL : DEFAULT_FREE_MODEL
    }

    // ── Load or create conversation ───────────────────────────────────────────
    let conversation
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId: user._id })
      if (!conversation) return res.status(404).json({ message: 'Conversation not found' })
    } else {
      conversation = new Conversation({
        userId: user._id, model: selectedModel,
        systemPrompt, features: { memoryEnabled },
      })
    }

    // ── System prompt ─────────────────────────────────────────────────────────
    let sysContent = systemPrompt?.trim()
      || conversation.systemPrompt?.trim()
      || user.systemPrompt?.trim()
      || DEFAULT_SYSTEM

    if (user.language === 'hi') {
  sysContent += '\n\nThe user prefers Hindi. Respond in Hindi unless the user writes in English.'
}
if (user.language === 'pa') {
  sysContent += '\n\nThe user prefers Punjabi. Respond in Punjabi unless the user writes in English.'
}

    if (memoryEnabled && user.memory?.length > 0) {
      const memLines = user.memory.map(m => `${m.key}: ${m.value}`).join('\n')
      sysContent += `\n\nWhat you know about this user:\n${memLines}`
    }

    // ── Inject document text ──────────────────────────────────────────────────
    // Text is extracted on the frontend and sent here as plain strings.
    // We inject into the system prompt so every model (not just vision) can use it.
    if (docs.length > 0) {
      const docBlock = docs
        .map(d => `### Document: ${d.name}\n${d.text.slice(0, 8000)}`)
        .join('\n\n---\n\n')
      sysContent += `\n\n---\nThe user has attached document(s). Use them to answer accurately:\n\n${docBlock}`
    }

    // ── Build history ─────────────────────────────────────────────────────────
    // CRITICAL: always normalise content to string.
    // This is what causes messages[N].content must be a string — if any old
    // message was ever stored with array content, this collapses it to text.
    const historyMessages = conversation.messages
      .slice(-20)
      .map(m => ({
        role:    m.role === 'assistant' ? 'assistant' : 'user',
        content: normaliseToString(m.content),
      }))

    // ── Build the new user message ────────────────────────────────────────────
    // Multimodal array only for the CURRENT message when images are present.
    // History is always plain strings (see above).
    let userMessageContent
    if (images.length > 0) {
      userMessageContent = [
        { type: 'text', text: message },
        ...images.map(img => ({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` },
        })),
      ]
    } else {
      userMessageContent = message
    }

    const groqMessages = [
      { role: 'system', content: sysContent },
      ...historyMessages,
      { role: 'user', content: userMessageContent },
    ]

    // ── Save user message as PLAIN STRING in DB (never as array) ─────────────
    conversation.messages.push({ role: 'user', content: message, type: 'text' })
    if (conversation.messages.filter(m => m.role === 'user').length === 1) {
      conversation.generateTitle()
    }

    // ── SSE setup ─────────────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    let fullContent = '', inputTokens = 0, outputTokens = 0

    const stream = await groq.chat.completions.create({
      model:       selectedModel,
      messages:    groqMessages,
      stream:      true,
      max_tokens:  user.plan === 'pro' ? 4096 : 2048,
      temperature: 0.7,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      if (delta) {
        fullContent += delta
        res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`)
      }
      if (chunk.x_groq?.usage) {
        inputTokens  = chunk.x_groq.usage.prompt_tokens     || 0
        outputTokens = chunk.x_groq.usage.completion_tokens || 0
      }
    }

    if (!inputTokens)  inputTokens  = Math.ceil(groqMessages.map(m => normaliseToString(m.content)).join(' ').split(' ').length * 1.3)
    if (!outputTokens) outputTokens = Math.ceil(fullContent.split(' ').length * 1.3)

    const totalTokens = inputTokens + outputTokens
    const cost        = estimateCost(selectedModel, inputTokens, outputTokens)

    conversation.messages.push({ role: 'assistant', content: fullContent, type: 'text', tokens: totalTokens, cost })
    conversation.totalTokens = (conversation.totalTokens || 0) + totalTokens
    conversation.totalCost   = (conversation.totalCost   || 0) + cost
    await conversation.save()

    user.usage.messagesToday   = (user.usage.messagesToday   || 0) + 1
    user.usage.totalMessages   = (user.usage.totalMessages   || 0) + 1
    user.usage.totalTokensUsed = (user.usage.totalTokensUsed || 0) + totalTokens
    user.usage.totalCost       = (user.usage.totalCost       || 0) + cost
    await user.save()

    res.write(`data: ${JSON.stringify({
      type: 'done',
      conversationId:  conversation._id,
      tokens:          totalTokens,
      cost,
      model:           selectedModel,
      messagesToday:   user.usage.messagesToday,
      dailyLimit:      user.getDailyLimit(),
    })}\n\n`)
    res.end()

  } catch (err) {
    console.error('Chat error:', err)
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'Chat failed' })}\n\n`)
    res.end()
  }
})

// POST /api/chat/suggestions
router.post('/suggestions', protect, async (req, res) => {
  try {
    const { lastMessage, conversationContext = '' } = req.body
    if (!lastMessage?.trim()) return res.json({ suggestions: [] })

    const prompt = `Based on this AI response, generate exactly 3 short follow-up questions a user might ask. Return ONLY a JSON array of 3 strings. No explanation, no markdown, just the array.\n\nAI response: "${lastMessage.slice(0, 800)}"\n${conversationContext ? `Context: ${conversationContext.slice(0, 200)}` : ''}\n\nReturn format: ["question 1?", "question 2?", "question 3?"]`

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200, temperature: 0.8,
    })

    const text = response.choices[0]?.message?.content?.trim() || '[]'
    let suggestions = []
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      suggestions = JSON.parse(clean)
      if (!Array.isArray(suggestions)) suggestions = []
      suggestions = suggestions.slice(0, 3).filter(s => typeof s === 'string' && s.trim())
    } catch { suggestions = [] }

    res.json({ suggestions })
  } catch (err) {
    console.error('Suggestions error:', err)
    res.json({ suggestions: [] })
  }
})

// POST /api/chat/memory
router.post('/memory', protect, async (req, res) => {
  try {
    const { key, value } = req.body
    if (!key?.trim() || !value?.trim()) return res.status(400).json({ message: 'Key and value required' })
    const user = await User.findById(req.user._id)
    const idx = user.memory.findIndex(m => m.key === key.trim())
    if (idx >= 0) user.memory[idx].value = value.trim()
    else user.memory.push({ key: key.trim(), value: value.trim() })
    await user.save()
    res.json({ memory: user.memory })
  } catch { res.status(500).json({ message: 'Server error' }) }
})

// DELETE /api/chat/memory/:key
router.delete('/memory/:key', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    user.memory = user.memory.filter(m => m.key !== req.params.key)
    await user.save()
    res.json({ memory: user.memory })
  } catch { res.status(500).json({ message: 'Server error' }) }
})

// POST /api/chat/templates
router.post('/templates', protect, async (req, res) => {
  try {
    const { title, content } = req.body
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ message: 'Title and content required' })
    const user = await User.findById(req.user._id)
    user.promptTemplates.push({ title: title.trim(), content: content.trim() })
    await user.save()
    res.json({ promptTemplates: user.promptTemplates })
  } catch { res.status(500).json({ message: 'Server error' }) }
})

// DELETE /api/chat/templates/:id
router.delete('/templates/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    user.promptTemplates = user.promptTemplates.filter(t => t._id.toString() !== req.params.id)
    await user.save()
    res.json({ promptTemplates: user.promptTemplates })
  } catch { res.status(500).json({ message: 'Server error' }) }
})

module.exports = router
