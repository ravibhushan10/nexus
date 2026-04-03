const express      = require('express')
const router       = express.Router()
const { protect }  = require('../middleware/auth')
const Conversation = require('../models/Conversation')

// GET /api/conversations
router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id, isDeleted: false })
      .select('title model createdAt updatedAt totalTokens totalCost isPinned features folder systemPrompt isPublic shareToken')
      .sort({ isPinned: -1, updatedAt: -1 })
      .limit(200)
    res.json({ conversations })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/conversations/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id:       req.params.id,
      userId:    req.user._id,
      isDeleted: false,
    })
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' })
    res.json({ conversation })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUBLIC share endpoint — NO auth required ──────────────────────────────────
// GET /api/share/:shareToken
router.get('/public/:shareToken', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      shareToken: req.params.shareToken,
      isPublic:   true,
      isDeleted:  false,
    }).select('title messages createdAt updatedAt')  // never expose userId or cost

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

// ── Enable sharing — generates token if not present ──────────────────────────
// POST /api/conversations/:id/share
router.post('/:id/share', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id:       req.params.id,
      userId:    req.user._id,
      isDeleted: false,
    })
    if (!conversation) return res.status(404).json({ message: 'Not found' })

    // Re-use existing token if already shared
    if (!conversation.shareToken) {
      conversation.generateShareToken()
    } else {
      conversation.isPublic = true
    }

    await conversation.save()
    res.json({ shareToken: conversation.shareToken, isPublic: conversation.isPublic })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── Disable sharing — keeps token in DB but sets isPublic = false ─────────────
// POST /api/conversations/:id/unshare
router.post('/:id/unshare', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isPublic: false, shareToken: null },
      { new: true }
    )
    if (!conversation) return res.status(404).json({ message: 'Not found' })
    res.json({ isPublic: false })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/conversations/:id/rename
router.put('/:id/rename', protect, async (req, res) => {
  try {
    const { title } = req.body
    if (!title?.trim()) return res.status(400).json({ message: 'Title required' })
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: title.trim() },
      { new: true }
    )
    if (!conversation) return res.status(404).json({ message: 'Not found' })
    res.json({ conversation })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/conversations/:id/pin
router.put('/:id/pin', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id })
    if (!conversation) return res.status(404).json({ message: 'Not found' })
    conversation.isPinned = !conversation.isPinned
    await conversation.save()
    res.json({ isPinned: conversation.isPinned })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/conversations/:id/folder
router.put('/:id/folder', protect, async (req, res) => {
  try {
    const { folder } = req.body
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { folder: folder?.trim() || '' },
      { new: true }
    )
    if (!conversation) return res.status(404).json({ message: 'Not found' })
    res.json({ folder: conversation.folder })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/conversations/:id/system-prompt
router.put('/:id/system-prompt', protect, async (req, res) => {
  try {
    const { systemPrompt } = req.body
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { systemPrompt: systemPrompt?.trim() || '' },
      { new: true }
    )
    if (!conversation) return res.status(404).json({ message: 'Not found' })
    res.json({ systemPrompt: conversation.systemPrompt })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/conversations/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isDeleted: true }
    )
    if (!conversation) return res.status(404).json({ message: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/conversations  — delete all
router.delete('/', protect, async (req, res) => {
  try {
    await Conversation.updateMany({ userId: req.user._id }, { isDeleted: true })
    res.json({ message: 'All conversations deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
