const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  razorpayOrderId:   { type: String, required: true },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
  amount:            { type: Number, required: true }, // in paise
  currency:          { type: String, default: 'INR' },
  plan:              { type: String, enum: ['pro'], required: true },
  billing:           { type: String, enum: ['monthly', 'annual'], default: 'monthly' }, // ← NEW
  status:            { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
  receipt:           { type: String, required: true },
}, { timestamps: true })

module.exports = mongoose.model('Payment', paymentSchema)
