

const GROQ_PRICING = {
  'llama3-8b-8192':         { input: 0.05,  output: 0.08  },
  'llama-3.3-70b-versatile':{ input: 0.59,  output: 0.79  },
  'whisper-large-v3':       { perMinute: 0.111 },
}


const estimateCost = (model, inputTokens, outputTokens = 0) => {
  const p = GROQ_PRICING[model]
  if (!p) return 0
  if (p.perMinute) return parseFloat((p.perMinute * (inputTokens / 60)).toFixed(6))
  const cost = ((inputTokens / 1_000_000) * p.input) + ((outputTokens / 1_000_000) * p.output)
  return parseFloat(cost.toFixed(8))
}

module.exports = { estimateCost, GROQ_PRICING }
