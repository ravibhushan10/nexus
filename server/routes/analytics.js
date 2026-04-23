const express      = require('express')
const router       = express.Router()
const { protect }  = require('../middleware/auth')
const Conversation = require('../models/Conversation')
const User         = require('../models/User')


router.get('/overview', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('usage plan')


    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [recentConversations, totalConversations] = await Promise.all([
      Conversation.find({
        userId:    req.user._id,
        isDeleted: false,
        createdAt: { $gte: sevenDaysAgo },
      }).select('messages totalTokens totalCost createdAt'),
      Conversation.countDocuments({ userId: req.user._id, isDeleted: false }),
    ])


    const dailyStats = {}
    for (let i = 6; i >= 0; i--) {
      const d   = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      dailyStats[key] = { messages: 0, tokens: 0, cost: 0 }
    }

    for (const conv of recentConversations) {
      const key = new Date(conv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (dailyStats[key]) {
        dailyStats[key].messages += conv.messages.filter(m => m.role === 'user').length
        dailyStats[key].tokens  += conv.totalTokens || 0
        dailyStats[key].cost    += conv.totalCost   || 0
      }
    }

    const limit = user.plan === 'pro' ? 500 : 20

    res.json({
      usage: user.usage,
      plan:  user.plan,
      dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({ date, ...stats })),
      totalConversations,
      totalConversations,
      limits: {
        messagesPerDay: limit,
        remaining: Math.max(0, limit - (user.usage.messagesToday || 0)),
      },
    })
  } catch (err) {
    console.error('Analytics error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
