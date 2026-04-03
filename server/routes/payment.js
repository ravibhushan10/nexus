const express  = require('express')
const router   = express.Router()
const crypto   = require('crypto')
const { protect } = require('../middleware/auth')
const User        = require('../models/User')
const Payment     = require('../models/Payment')

// Pricing (in paise)
const PRICES = {
  monthly: 100,   // ₹99
  annual:  79900,  // ₹799
}

// Lazy-load Razorpay
let razorpay
const getRazorpay = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env')
    }
    const Razorpay = require('razorpay')
    razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return razorpay
}

// POST /api/payment/create-order
router.post('/create-order', protect, async (req, res) => {
  try {
    if (req.user.plan === 'pro') {
      return res.status(400).json({ message: 'You are already on the Pro plan' })
    }

    const { plan = 'pro', billing = 'monthly' } = req.body

    // Validate billing cycle
    if (!['monthly', 'annual'].includes(billing)) {
      return res.status(400).json({ message: 'Invalid billing cycle' })
    }

    const amount  = PRICES[billing]
   const receipt = `nx_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`

    const order = await getRazorpay().orders.create({
      amount,
      currency: 'INR',
      receipt,
      notes: { userId: req.user._id.toString(), plan, billing },
    })

    await Payment.create({
      userId:          req.user._id,
      razorpayOrderId: order.id,
      amount,
      plan,
      billing,   // store billing cycle
      receipt,
    })

    res.json({
      orderId:  order.id,
      amount,
      currency: 'INR',
      keyId:    process.env.RAZORPAY_KEY_ID,
      user: { name: req.user.name, email: req.user.email },
    })
  } catch (err) {
    console.error('Payment order error:', err)
    res.status(500).json({ message: err.message || 'Failed to create order' })
  }
})

// POST /api/payment/verify
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ message: 'Missing payment fields' })

    // Verify HMAC signature
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')

    if (expected !== razorpay_signature)
      return res.status(400).json({ message: 'Payment verification failed — invalid signature' })

    // Mark payment as paid
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, status: 'paid' }
    )

    // Upgrade user
    await User.findByIdAndUpdate(req.user._id, {
      plan: 'pro',
      'razorpay.paymentId': razorpay_payment_id,
    })

    res.json({ message: 'Payment verified! Welcome to Pro.', plan: 'pro' })
  } catch (err) {
    console.error('Payment verify error:', err)
    res.status(500).json({ message: 'Verification failed' })
  }
})

// GET /api/payment/history
router.get('/history', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id, status: 'paid' })
      .select('amount currency plan billing status createdAt razorpayPaymentId')
      .sort({ createdAt: -1 })
    res.json({ payments })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/payment/downgrade
router.post('/downgrade', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { plan: 'free' })
    res.json({ message: 'Downgraded to Free plan' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
