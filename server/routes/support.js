const express = require('express')
const router  = express.Router()
const { sendSupportEmail } = require('../utils/sendEmail')

router.post('/contact', async (req, res) => {
  const { name, email, category, subject, message } = req.body

  if (!name || !email || !subject || !message)
    return res.status(400).json({ message: 'All fields are required' })

  try {
    await sendSupportEmail({ name, email, category, subject, message })
    res.json({ message: 'Message sent successfully' })
  } catch (err) {
    console.error('Support email error:', err.message)
    res.status(500).json({ message: 'Failed to send message' })
  }
})

module.exports = router
