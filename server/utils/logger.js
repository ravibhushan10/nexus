const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
}

const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false })

const logger = {
  info:    (...a) => console.log(`${c.gray}[${ts()}]${c.reset} ${c.cyan}info${c.reset}   `, ...a),
  success: (...a) => console.log(`${c.gray}[${ts()}]${c.reset} ${c.green}ready${c.reset}  `, ...a),
  warn:    (...a) => console.log(`${c.gray}[${ts()}]${c.reset} ${c.yellow}warn${c.reset}   `, ...a),
  error:   (...a) => console.log(`${c.gray}[${ts()}]${c.reset} ${c.red}error${c.reset}  `, ...a),
  request: (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${c.gray}[${ts()}] ${req.method.padEnd(6)} ${req.path}${c.reset}`)
    }
    next()
  },
}

module.exports = logger
