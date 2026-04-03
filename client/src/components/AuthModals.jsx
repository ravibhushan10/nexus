import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useOAuth, isFirebaseConfigured } from '../hooks/useAuth.js'
import api from '../utils/api'
import styles from './AuthModals.module.css'

// OTP policy (must match backend constants)
const OTP_EXPIRY_SECS  = 2 * 60   // 2 minutes
const OTP_MAX_ATTEMPTS = 2         // show 1 attempt remaining after 1st wrong, lock after 2nd

// ── Entry point ──────────────────────────────────────────────────────────────
export default function AuthModals({
  showLogin, onCloseLogin,
  showRegister, onCloseRegister,
  onSwitchToRegister, onSwitchToLogin,
}) {
  return (
    <>
      {showLogin    && <LoginModal    onClose={onCloseLogin}    onSwitch={onSwitchToRegister} />}
      {showRegister && <RegisterModal onClose={onCloseRegister} onSwitch={onSwitchToLogin}    />}
    </>
  )
}

// ── SVG Icons ────────────────────────────────────────────────────────────────
function EyeOpen() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function EyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h12.4c-.5 2.9-2.2 5.3-4.6 6.9v5.7h7.5c4.4-4 6.8-10 6.8-16.7z"/>
      <path fill="#34A853" d="M24 47c6.2 0 11.4-2.1 15.2-5.6l-7.5-5.7c-2 1.4-4.6 2.2-7.7 2.2-5.9 0-10.9-4-12.7-9.4H3.5v5.9C7.3 41.7 15 47 24 47z"/>
      <path fill="#FBBC05" d="M11.3 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5v-5.9H3.5C1.3 17.6 0 20.7 0 24s1.3 6.4 3.5 8.4l7.8-3.9z"/>
      <path fill="#EA4335" d="M24 9.5c3.3 0 6.3 1.1 8.6 3.4l6.4-6.4C35.4 2.8 30.2.5 24 .5 15 .5 7.3 5.8 3.5 13.6l7.8 5.9C13.1 13.5 18.1 9.5 24 9.5z"/>
    </svg>
  )
}
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.7 18 5 18 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6C20.6 21.8 24 17.3 24 12 24 5.4 18.6 0 12 0z"/>
    </svg>
  )
}

// ── Banner — error / warning / success with action links ─────────────────────
function Banner({ error, onGoogle, onGitHub, onSwitchToLogin, onSwitchToRegister }) {
  if (!error) return null

  let cls = styles.bannerError
  if (error.type === 'warning') cls = styles.bannerWarning
  if (error.type === 'success') cls = styles.bannerSuccess

  return (
    <div className={`${styles.banner} ${cls}`}>
      <p className={styles.bannerMsg}>{error.message}</p>

      {error.code === 'OAUTH_EMAIL_CONFLICT' && (
        <button type="button" className={styles.hintBtn} onClick={onSwitchToLogin}>
          Sign in with password →
        </button>
      )}
      {error.code === 'USE_OAUTH' && error.provider === 'google' && (
        <button type="button" className={styles.hintBtn} onClick={onGoogle}>
          Continue with Google →
        </button>
      )}
      {error.code === 'USE_OAUTH' && error.provider === 'github' && (
        <button type="button" className={styles.hintBtn} onClick={onGitHub}>
          Continue with GitHub →
        </button>
      )}
      {error.hint === 'login'    && !error.code && (
        <button type="button" className={styles.hintBtn} onClick={onSwitchToLogin}>Sign in instead →</button>
      )}
      {error.hint === 'register' && !error.code && (
        <button type="button" className={styles.hintBtn} onClick={onSwitchToRegister}>Create an account →</button>
      )}
    </div>
  )
}

function FieldError({ msg }) {
  if (!msg) return null
  return <p className={styles.fieldHintError}>{msg}</p>
}

const PWD_RULES = [
  { key: 'len',     label: 'At least 8 characters',        test: p => p.length >= 8 },
  { key: 'upper',   label: 'At least 1 uppercase letter',  test: p => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'At least 1 lowercase letter',  test: p => /[a-z]/.test(p) },
  { key: 'number',  label: 'At least 1 number',            test: p => /\d/.test(p) },
  { key: 'special', label: 'At least 1 special character', test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
]
function isStrongPassword(p) { return PWD_RULES.every(r => r.test(p)) }

function PasswordChecklist({ password, showErrors }) {
  return (
    <ul className={styles.checklist}>
      {PWD_RULES.map(r => {
        const met = r.test(password)
        return (
          <li key={r.key} className={met ? styles.checkMet : showErrors ? styles.checkFail : styles.checkUnmet}>
            {met ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : showErrors ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <span className={styles.checkDot} />
            )}
            {r.label}
          </li>
        )
      })}
    </ul>
  )
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// ── OTP countdown: MM:SS, turns red under 30s ─────────────────────────────
function OtpTimer({ countdown }) {
  if (!countdown || countdown <= 0) return null
  const m   = String(Math.floor(countdown / 60)).padStart(2, '0')
  const s   = String(countdown % 60).padStart(2, '0')
  const hot = countdown < 30
  return (
    <p style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
      Resend available in{' '}
      <strong style={{
        color:       hot ? 'var(--red)' : 'var(--purple)',
        fontFamily:  'var(--font-mono)',
        transition:  'color .3s',
      }}>
        {m}:{s}
      </strong>
    </p>
  )
}

// ── Attempt indicator: shows dots for remaining tries ────────────────────────
function AttemptDots({ remaining, max }) {
  if (remaining >= max) return null
  return (
    <p style={{ textAlign: 'center', fontSize: '.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{
          display:       'inline-block',
          width:         8, height: 8,
          borderRadius:  '50%',
          margin:        '0 3px',
          background:    i < remaining ? 'var(--purple)' : 'var(--border)',
          transition:    'background .2s',
        }} />
      ))}
      {' '}{remaining} attempt{remaining === 1 ? '' : 's'} left
    </p>
  )
}

// ── 6-box OTP input ──────────────────────────────────────────────────────────
function OtpInput({ otp, setOtp, otpError, otpRefs, disabled }) {
  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) otpRefs.current[i + 1]?.focus()
  }
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace'  && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft'  && i > 0)             otpRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5)             otpRefs.current[i + 1]?.focus()
  }
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) { setOtp(pasted.split('')); otpRefs.current[5]?.focus(); e.preventDefault() }
  }
  return (
    <div className={styles.otpRow} onPaste={handlePaste}>
      {otp.map((digit, i) => (
        <input key={i} ref={el => otpRefs.current[i] = el}
          className={`${styles.otpBox} ${otpError ? styles.otpBoxError : ''}`}
          type="text" inputMode="numeric" maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          autoFocus={i === 0}
          style={disabled ? { opacity: .4, cursor: 'not-allowed' } : {}}
        />
      ))}
    </div>
  )
}


// ── Modal shell ──────────────────────────────────────────────────────────────
function ModalShell({ onClose, children }) {
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {children}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LOGIN MODAL
// ════════════════════════════════════════════════════════════════════════════
function LoginModal({ onClose, onSwitch }) {
  const { login }                            = useAuth()
  const { loginWithGoogle, loginWithGitHub } = useOAuth()
  const navigate = useNavigate()

  const [screen, setScreen] = useState('login')

  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [showPwd,        setShowPwd]        = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [oauthError,     setOauthError]     = useState(null)
  const [serverError,    setServerError]    = useState(null)
  const [fieldErrors,    setFieldErrors]    = useState({})
  const [needsVerify,    setNeedsVerify]    = useState(false)
  const [resendEmail,    setResendEmail]    = useState('')
  const [resendLoading,  setResendLoading]  = useState(false)
  const [resendDone,     setResendDone]     = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Forgot-password state
  const [fpEmail,    setFpEmail]    = useState('')
  const [fpLoading,  setFpLoading]  = useState(false)
  const [fpError,    setFpError]    = useState(null)
  const [fpCooldown, setFpCooldown] = useState(0)

  // OTP state (shared for reset flow)
  const [otp,               setOtp]               = useState(['','','','','',''])
  const [otpLoading,        setOtpLoading]         = useState(false)
  const [otpError,          setOtpError]           = useState('')
  const [otpExpiry,         setOtpExpiry]          = useState(null)
  const [otpCountdown,      setOtpCountdown]       = useState(0)
  const [otpResendCooldown, setOtpResendCooldown]  = useState(0)
  const [otpAttemptsLeft,   setOtpAttemptsLeft]    = useState(OTP_MAX_ATTEMPTS)
  const [otpLocked,         setOtpLocked]          = useState(false)
  const otpRefs = useRef([])

  // New password state
  const [resetToken,    setResetToken]    = useState('')
  const [newPwd,        setNewPwd]        = useState('')
  const [newPwdShow,    setNewPwdShow]    = useState(false)
  const [newPwdFocused, setNewPwdFocused] = useState(false)
  const [newPwdErrors,  setNewPwdErrors]  = useState(false)
  const [newPwdLoading, setNewPwdLoading] = useState(false)
  const [newPwdError,   setNewPwdError]   = useState('')

  // ── Countdown timers ─────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'otp' || !otpExpiry) return
    const iv = setInterval(() => {
      const left = Math.max(0, Math.ceil((otpExpiry - Date.now()) / 1000))
      setOtpCountdown(left)
      if (left === 0) clearInterval(iv)
    }, 500)
    return () => clearInterval(iv)
  }, [screen, otpExpiry])

  useEffect(() => {
    if (fpCooldown <= 0) return
    const t = setTimeout(() => setFpCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [fpCooldown])

  useEffect(() => {
    if (otpResendCooldown <= 0) return
    const t = setTimeout(() => setOtpResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [otpResendCooldown])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const clearAll = () => {
    setOauthError(null); setServerError(null); setFieldErrors({})
    setNeedsVerify(false); setResendDone(false)
  }

  const validateLogin = () => {
    if (!email.trim())            return { email: 'Email address is required.' }
    if (!EMAIL_REGEX.test(email)) return { email: 'Please enter a valid email address.' }
    if (!password)                return { password: 'Password is required.' }
    return {}
  }

  const submit = async (e) => {
    e.preventDefault(); clearAll()
    const errs = validateLogin()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.user, data.accessToken, data.refreshToken)
      onClose(); navigate('/chat')
    } catch (err) {
      const code     = err.response?.data?.code
      const provider = err.response?.data?.provider
      const msg      = err.response?.data?.message || 'Login failed. Please try again.'
      if (code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerify(true); setResendEmail(email)
        setServerError({ message: msg, code, type: 'warning' })
      } else if (code === 'USE_OAUTH') {
        setServerError({ message: msg, code, provider, type: 'warning' })
      } else {
        setServerError({ message: msg, code })
      }
    } finally { setLoading(false) }
  }

  const handleResendVerification = async () => {
    setResendLoading(true); setResendDone(false)
    try {
      await api.post('/auth/resend-otp', { email: resendEmail })
      setResendDone(true); setResendCooldown(120)
    } catch (err) {
      setServerError({ message: err.response?.data?.message || 'Failed to resend.' })
    } finally { setResendLoading(false) }
  }

  // ── OAuth handlers ────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    clearAll()
    try {
      const u = await loginWithGoogle()
      if (u) { onClose(); navigate('/chat') }
    } catch (err) {
      const data = err.response?.data
      setOauthError({
        message:  data?.message  || err.friendlyMessage || 'Google sign-in failed.',
        code:     data?.code     || null,
        provider: data?.provider || null,
      })
    }
  }

  const handleGitHub = async () => {
    clearAll()
    try {
      const u = await loginWithGitHub()
      if (u) { onClose(); navigate('/chat') }
    } catch (err) {
      const data = err.response?.data
      setOauthError({
        message:  data?.message  || err.friendlyMessage || 'GitHub sign-in failed.',
        code:     data?.code     || null,
        provider: data?.provider || null,
      })
    }
  }

  // ── Forgot-password flow ──────────────────────────────────────────────────
  const sendResetOtp = async (isResend = false) => {
    setFpError(null); setFpLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: fpEmail })
      setOtpExpiry(Date.now() + OTP_EXPIRY_SECS * 1000)
      setOtpCountdown(OTP_EXPIRY_SECS)
      setOtpResendCooldown(30)
      setOtpAttemptsLeft(OTP_MAX_ATTEMPTS)
      setOtpLocked(false)
      setOtp(['','','','','','']); setOtpError('')
      if (!isResend) setScreen('otp')
      else setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } catch (err) {
      const data = err.response?.data
      const errObj = { message: data?.message || 'Failed to send Otp.', code: data?.code || null, provider: data?.provider || null }
      if (isResend) setOtpError(errObj.message)
      else { setFpError(errObj); setFpCooldown(30) }
    } finally { setFpLoading(false) }
  }

  const verifyResetOtp = async () => {
    const code = otp.join('')
    if (code.length < 6)      return setOtpError('Please enter all 6 digits.')
    if (otpLocked)             return setOtpError('Too many wrong attempts. Please request a new Otp.')
    if (otpCountdown === 0)    return setOtpError('Otp expired. Please request a new one.')
    setOtpLoading(true); setOtpError('')
    try {
      const { data } = await api.post('/auth/verify-reset-otp', { email: fpEmail, otp: code })
      setResetToken(data.resetToken)
      setScreen('newPwd')
    } catch (err) {
      const errCode = err.response?.data?.code
      const msg     = err.response?.data?.message || 'Invalid Otp.'
      setOtpError(msg)
      if (errCode === 'OTP_LOCKED') {
       setOtpLocked(true)
  setOtpAttemptsLeft(0)
  setOtp(['','','','','',''])
  setOtpResendCooldown(30)
      } else if (errCode === 'INVALID_OTP') {
        setOtpAttemptsLeft(prev => Math.max(0, prev - 1))
        setOtp(['','','','','',''])
        setTimeout(() => otpRefs.current[0]?.focus(), 50)
      }
    } finally { setOtpLoading(false) }
  }

  const resetPassword = async () => {
    setNewPwdErrors(true)
    if (!isStrongPassword(newPwd)) return
    setNewPwdLoading(true); setNewPwdError('')
    try {
      await api.post('/auth/reset-password', { email: fpEmail, resetToken, newPassword: newPwd })
      setScreen('success')
    } catch (err) {
      setNewPwdError(err.response?.data?.message || 'Failed to reset. Please try again.')
    } finally { setNewPwdLoading(false) }
  }

  // ══ SCREEN: login ══════════════════════════════════════════════════════════
  if (screen === 'login') return (
    <ModalShell onClose={onClose}>
      <h2 className={styles.title}>Welcome back</h2>
      <p className={styles.subtitle}>Sign in to continue to NexusAI</p>

      <form onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label>Email <span className={styles.required}>*</span></label>
          <input className={`input-field ${fieldErrors.email ? styles.inputError : ''}`}
            type="email" placeholder="you@example.com" value={email}
            onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); setServerError(null); setNeedsVerify(false) }}
            autoComplete="email"
          />
          <FieldError msg={fieldErrors.email} />
        </div>

        <div className={styles.field}>
          <label>Password <span className={styles.required}>*</span></label>
          <div className={styles.pwdWrap}>
            <input className={`input-field ${fieldErrors.password ? styles.inputError : ''}`}
              type={showPwd ? 'text' : 'password'} placeholder="Your password" value={password}
              onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); setServerError(null) }}
              autoComplete="current-password"
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPwd(p => !p)}>
              {showPwd ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>
          <FieldError msg={fieldErrors.password} />
          <button type="button" className={styles.forgotLink}
            onClick={() => { setFpEmail(email); setFpError(null); setFpCooldown(0); setScreen('forgotEmail') }}>
            Forgot password?
          </button>
        </div>

        {needsVerify && (
          <div className={`${styles.banner} ${styles.bannerWarning}`} style={{ marginBottom: 12 }}>
            <p className={styles.bannerMsg}>{serverError?.message}</p>
            {resendDone
              ? <p style={{ marginTop: 6, fontSize: '.8rem' }}>✓ New Otp sent! Check your inbox.</p>
              : <button type="button" className={styles.hintBtn} onClick={handleResendVerification}
                  disabled={resendLoading || resendCooldown > 0}>
                  {resendLoading ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification Otp'}
                </button>
            }
          </div>
        )}

        {serverError && !needsVerify && (
          <Banner error={serverError} onGoogle={handleGoogle} onGitHub={handleGitHub}
            onSwitchToLogin={onSwitch} onSwitchToRegister={onSwitch} />
        )}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? <><span className={styles.spinner} /> Signing in…</> : 'Sign In'}
        </button>
      </form>

      <div className={styles.orDivider}><span>or</span></div>
      <button className={styles.socialBtn} onClick={handleGoogle}><GoogleIcon /> Continue with Google</button>
      <button className={styles.socialBtn} onClick={handleGitHub}><GitHubIcon /> Continue with GitHub</button>

      {oauthError && (
        <Banner error={oauthError} onGoogle={handleGoogle} onGitHub={handleGitHub}
          onSwitchToLogin={() => setOauthError(null)} onSwitchToRegister={onSwitch} />
      )}

      <p className={styles.switchText}>
        Don't have an account? <button className={styles.switchBtn} onClick={onSwitch}>Sign up</button>
      </p>
    </ModalShell>
  )

  // ══ SCREEN: forgotEmail ═════════════════════════════════════════════════════
  if (screen === 'forgotEmail') return (
    <ModalShell onClose={onClose}>
      <button type="button" className={styles.backBtn}
        onClick={() => { setScreen('login'); setFpError(null); setFpCooldown(0) }}>← Back</button>
      <h2 className={styles.title} style={{ marginTop: 12 }}>Reset your password</h2>
      <p className={styles.subtitle}>Enter your email and we'll send a 6-digit Otp.</p>

      <div className={styles.field}>
        <label>Email <span className={styles.required}>*</span></label>
        <input className="input-field" type="email" placeholder="you@example.com" value={fpEmail}
          onChange={e => { setFpEmail(e.target.value); setFpError(null) }} autoFocus />
      </div>

      {fpError && (
        <Banner error={fpError} onGoogle={handleGoogle} onGitHub={handleGitHub}
          onSwitchToLogin={() => setScreen('login')} onSwitchToRegister={onSwitch} />
      )}

      <button className={styles.submitBtn}
        onClick={() => sendResetOtp(false)}
        disabled={fpLoading || !fpEmail.trim() || fpCooldown > 0}>
        {fpLoading ? <><span className={styles.spinner} /> Sending…</> : fpCooldown > 0 ? `Wait ${fpCooldown}s` : 'Send Reset Otp'}
      </button>
    </ModalShell>
  )

  // ══ SCREEN: otp ═════════════════════════════════════════════════════════════
  if (screen === 'otp') return (
    <ModalShell onClose={onClose}>
      <button type="button" className={styles.backBtn}
        onClick={() => { setScreen('forgotEmail'); setOtp(['','','','','','']); setOtpError(''); setOtpLocked(false); setOtpAttemptsLeft(OTP_MAX_ATTEMPTS) }}>
        ← Back
      </button>
      <h2 className={styles.title} style={{ marginTop: 12 }}>Enter reset Otp</h2>
      <p className={styles.subtitle}>
        6-digit Otp sent to <strong style={{ color: 'var(--text-primary)' }}>{fpEmail}</strong>
      </p>

      <OtpInput otp={otp} setOtp={v => { setOtp(v); setOtpError('') }}
        otpError={!!otpError} otpRefs={otpRefs} disabled={otpLocked || otpCountdown === 0} />

      <OtpTimer countdown={otpCountdown} />
      <AttemptDots remaining={otpAttemptsLeft} max={OTP_MAX_ATTEMPTS} />


      {otpError && (
        <div className={`${styles.banner} ${styles.bannerError}`} style={{ marginTop: 8 }}>
          <p className={styles.bannerMsg}>{otpError}</p>
        </div>
      )}

      {/* Show Resend when expired or locked, Verify otherwise */}
      {(otpCountdown === 0 || otpLocked) ? (
        <button className={styles.submitBtn} style={{ marginTop: 16 }}
          onClick={() => sendResetOtp(true)}
          disabled={fpLoading || otpResendCooldown > 0}>
          {fpLoading
            ? <><span className={styles.spinner} /> Sending…</>
            : otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : 'Resend New Otp'}
        </button>
      ) : (
        <button className={styles.submitBtn} style={{ marginTop: 16 }}
          onClick={verifyResetOtp}
          disabled={otpLoading || otp.join('').length < 6 || otpLocked}>
          {otpLoading ? <><span className={styles.spinner} /> Verifying…</> : 'Verify Otp'}
        </button>
      )}
    </ModalShell>
  )

  // ══ SCREEN: newPwd ══════════════════════════════════════════════════════════
  if (screen === 'newPwd') return (
    <ModalShell onClose={onClose}>
      <h2 className={styles.title}>Set new password</h2>
      <p className={styles.subtitle}>Choose a strong password for your account.</p>

      <div className={styles.field}>
        <label>New Password <span className={styles.required}>*</span></label>
        <div className={styles.pwdWrap}>
          <input className="input-field" type={newPwdShow ? 'text' : 'password'}
            placeholder="Min 8 characters" value={newPwd}
            onChange={e => { setNewPwd(e.target.value); setNewPwdError('') }}
            onFocus={() => setNewPwdFocused(true)} onBlur={() => setNewPwdFocused(false)}
            autoFocus
          />
          <button type="button" className={styles.eyeBtn} onClick={() => setNewPwdShow(p => !p)}>
            {newPwdShow ? <EyeOff /> : <EyeOpen />}
          </button>
        </div>
        {newPwdFocused && <PasswordChecklist password={newPwd} showErrors={newPwdErrors} />}
      </div>

      {newPwdError && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <p className={styles.bannerMsg}>{newPwdError}</p>
        </div>
      )}

      <button className={styles.submitBtn} onClick={resetPassword} disabled={newPwdLoading}>
        {newPwdLoading ? <><span className={styles.spinner} /> Saving…</> : 'Save New Password'}
      </button>
    </ModalShell>
  )

  // ══ SCREEN: success ═════════════════════════════════════════════════════════
  if (screen === 'success') return (
    <ModalShell onClose={onClose}>
      <div style={{ textAlign: 'center' }}>
        <div className={styles.successIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className={styles.title}>Password reset!</h2>
        <p className={styles.subtitle}>Your password has been updated. Sign in with your new password.</p>
        <button className={styles.submitBtn} onClick={() => {
          setNewPwd(''); setResetToken(''); setOtp(['','','','','',''])
          setOtpError(''); setNewPwdError(''); setFpError(null)
          setOtpCountdown(0); setOtpExpiry(null); setOtpResendCooldown(0)
          setOtpAttemptsLeft(OTP_MAX_ATTEMPTS); setOtpLocked(false)
          setFpCooldown(0); setEmail(fpEmail); setPassword(''); setServerError(null)
          setScreen('login')
        }}>
          Sign In
        </button>
      </div>
    </ModalShell>
  )

  return null
}

// ════════════════════════════════════════════════════════════════════════════
// REGISTER MODAL
// ════════════════════════════════════════════════════════════════════════════
function RegisterModal({ onClose, onSwitch }) {
  const { login }                            = useAuth()
  const { loginWithGoogle, loginWithGitHub } = useOAuth()
  const navigate = useNavigate()

  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwdFocused,  setPwdFocused]  = useState(false)
  const [pwdErrors,   setPwdErrors]   = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [oauthError,  setOauthError]  = useState(null)
  const [serverError, setServerError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const [screen,         setScreen]         = useState('form')
  const [regEmail,       setRegEmail]       = useState('')
  const [otp,            setOtp]            = useState(['','','','','',''])
  const [otpLoading,     setOtpLoading]     = useState(false)
  const [otpError,       setOtpError]       = useState('')
  const [otpExpiry,      setOtpExpiry]      = useState(null)
  const [otpCountdown,   setOtpCountdown]   = useState(0)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading,  setResendLoading]  = useState(false)
  const [resendDone,     setResendDone]     = useState(false)
  const [attemptsLeft,   setAttemptsLeft]   = useState(OTP_MAX_ATTEMPTS)
  const [otpLocked,      setOtpLocked]      = useState(false)
  const otpRefs = useRef([])

  const clearAll = () => { setOauthError(null); setServerError(null); setFieldErrors({}) }

  // Countdown
  useEffect(() => {
    if (screen !== 'otp' || !otpExpiry) return
    const iv = setInterval(() => {
      const left = Math.max(0, Math.ceil((otpExpiry - Date.now()) / 1000))
      setOtpCountdown(left)
      if (left === 0) clearInterval(iv)
    }, 500)
    return () => clearInterval(iv)
  }, [screen, otpExpiry])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const goToOtp = (emailVal) => {
    setRegEmail(emailVal)
    setOtpExpiry(Date.now() + OTP_EXPIRY_SECS * 1000)
    setOtpCountdown(OTP_EXPIRY_SECS)
    setResendCooldown(30)
    setAttemptsLeft(OTP_MAX_ATTEMPTS)
    setOtpLocked(false)
    setScreen('otp')
  }

  const verifyOtp = async () => {
    const code = otp.join('')
    if (code.length < 6)   return setOtpError('Please enter all 6 digits.')
    if (otpLocked)          return setOtpError('Too many wrong attempts. Please request a new Otp.')
    if (otpCountdown === 0) return setOtpError('Otp expired. Please request a new one.')
    setOtpLoading(true); setOtpError('')
    try {
      const { data } = await api.post('/auth/verify-otp', { email: regEmail, otp: code })
      login(data.user, data.accessToken, data.refreshToken)
      onClose(); navigate('/chat')
    } catch (err) {
      const errCode = err.response?.data?.code
      const msg     = err.response?.data?.message || 'Invalid Otp.'
      setOtpError(msg)
      if (errCode === 'OTP_LOCKED') {
          setOtpLocked(true)
  setAttemptsLeft(0)
  setOtp(['','','','','',''])
  setResendCooldown(30)
      } else if (errCode === 'INVALID_OTP') {
        setAttemptsLeft(prev => Math.max(0, prev - 1))
        setOtp(['','','','','',''])
        setTimeout(() => otpRefs.current[0]?.focus(), 50)
      }
    } finally { setOtpLoading(false) }
  }

  const resendOtp = async () => {
    setResendLoading(true); setOtpError(''); setResendDone(false)
    try {
      await api.post('/auth/resend-otp', { email: regEmail })
      setOtp(['','','','','',''])
      setOtpExpiry(Date.now() + OTP_EXPIRY_SECS * 1000)
      setOtpCountdown(OTP_EXPIRY_SECS)
      setResendCooldown(30)
      setAttemptsLeft(OTP_MAX_ATTEMPTS)
      setOtpLocked(false)
      setResendDone(true)
      setTimeout(() => setResendDone(false), 4000)
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to resend.')
    } finally { setResendLoading(false) }
  }

  const validateRegister = () => {
    if (!name.trim())                return { name: 'Full name is required.' }
    if (name.trim().length < 2)      return { name: 'Name must be at least 2 characters.' }
    if (!email.trim())               return { email: 'Email address is required.' }
    if (!EMAIL_REGEX.test(email))    return { email: 'Please enter a valid email address.' }
    if (!password)                   return { password: 'Password is required.' }
    if (!isStrongPassword(password)) return { password: 'Please use a stronger password.' }
    if (!confirm)                    return { confirm: 'Please confirm your password.' }
    if (password !== confirm)        return { confirm: "Passwords don't match." }
    return {}
  }

  const submit = async (e) => {
    e.preventDefault(); clearAll()
    const errs = validateRegister()
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      if (errs.password) { setPwdErrors(true); setPwdFocused(true) }
      return
    }
    setLoading(true)
    try {
      // Register returns 200/201 with code VERIFY_OTP — NOT an error
      await api.post('/auth/register', { name: name.trim(), email: email.trim(), password })
      goToOtp(email.trim())
    } catch (err) {
      const code     = err.response?.data?.code
      const provider = err.response?.data?.provider
      const msg      = err.response?.data?.message || 'Something went wrong. Please try again.'
      if (code === 'EMAIL_TAKEN') {
        setServerError({ message: msg, code, hint: 'login' })
      } else if (code === 'USE_OAUTH') {
        setServerError({ message: msg, code, provider })
      } else {
        setServerError({ message: msg })
      }
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    clearAll()
    try {
      const u = await loginWithGoogle()
      if (u) { onClose(); navigate('/chat') }
    } catch (err) {
      const data = err.response?.data
      setOauthError({
        message:  data?.message  || err.friendlyMessage || 'Google sign-up failed.',
        code:     data?.code     || null,
        provider: data?.provider || null,
      })
    }
  }

  const handleGitHub = async () => {
    clearAll()
    try {
      const u = await loginWithGitHub()
      if (u) { onClose(); navigate('/chat') }
    } catch (err) {
      const data = err.response?.data
      setOauthError({
        message:  data?.message  || err.friendlyMessage || 'GitHub sign-up failed.',
        code:     data?.code     || null,
        provider: data?.provider || null,
      })
    }
  }

  // ══ OTP SCREEN ══════════════════════════════════════════════════════════════
  if (screen === 'otp') return (
    <ModalShell onClose={onClose}>

      <h2 className={styles.title} style={{ marginTop: 12 }}>Verify your email</h2>
      <p className={styles.subtitle}>
        6-digit Otp sent to <strong style={{ color: 'var(--text-primary)' }}>{regEmail}</strong>
      </p>

      <OtpInput otp={otp} setOtp={v => { setOtp(v); setOtpError('') }}
        otpError={!!otpError} otpRefs={otpRefs} disabled={otpLocked || otpCountdown === 0} />

      <OtpTimer countdown={otpCountdown} />
      <AttemptDots remaining={attemptsLeft} max={OTP_MAX_ATTEMPTS} />


      {resendDone && (
        <div className={`${styles.banner} ${styles.bannerSuccess}`} style={{ marginTop: 8 }}>
          <p className={styles.bannerMsg}>✓ New Otp sent! Check your inbox.</p>
        </div>
      )}
      {otpError && (
        <div className={`${styles.banner} ${styles.bannerError}`} style={{ marginTop: 8 }}>
          <p className={styles.bannerMsg}>{otpError}</p>
        </div>
      )}

      {(otpCountdown === 0 || otpLocked) ? (
        <button className={styles.submitBtn} style={{ marginTop: 16 }}
          onClick={resendOtp} disabled={resendLoading || resendCooldown > 0}>
          {resendLoading
            ? <><span className={styles.spinner} /> Sending…</>
            : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend New Otp'}
        </button>
      ) : (
        <button className={styles.submitBtn} style={{ marginTop: 16 }}
          onClick={verifyOtp} disabled={otpLoading || otp.join('').length < 6}>
          {otpLoading ? <><span className={styles.spinner} /> Verifying…</> : 'Verify & Create Account'}
        </button>
      )}

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: '.8rem', color: 'var(--text-secondary)' }}>
        Wrong email?{' '}
        <button className={styles.switchBtn}
          onClick={() => { setScreen('form'); setOtp(['','','','','','']); setOtpError('') }}>
          Go back
        </button>
      </p>
    </ModalShell>
  )

  // ══ REGISTER FORM ════════════════════════════════════════════════════════════
  return (
    <ModalShell onClose={onClose}>
      <h2 className={styles.title}>Create your account</h2>
      <p className={styles.subtitle}>Start chatting with NexusAI today</p>

      <form onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label>Full Name <span className={styles.required}>*</span></label>
          <input className={`input-field ${fieldErrors.name ? styles.inputError : ''}`}
            placeholder="Your name" value={name}
            onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); setServerError(null) }}
          />
          <FieldError msg={fieldErrors.name} />
        </div>

        <div className={styles.field}>
          <label>Email <span className={styles.required}>*</span></label>
          <input className={`input-field ${fieldErrors.email ? styles.inputError : ''}`}
            type="email" placeholder="you@example.com" value={email}
            onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); setServerError(null) }}
          />
          <FieldError msg={fieldErrors.email} />
        </div>

        <div className={styles.field}>
          <label>Password <span className={styles.required}>*</span></label>
          <div className={styles.pwdWrap}>
            <input className={`input-field ${fieldErrors.password ? styles.inputError : ''}`}
              type={showPwd ? 'text' : 'password'} placeholder="Min 8 characters" value={password}
              onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); setPwdErrors(false); setServerError(null) }}
              onFocus={() => setPwdFocused(true)} onBlur={() => setPwdFocused(false)}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPwd(p => !p)}>
              {showPwd ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>
          {pwdFocused && <PasswordChecklist password={password} showErrors={pwdErrors} />}
          {fieldErrors.password && !pwdFocused && <FieldError msg={fieldErrors.password} />}
        </div>

        <div className={styles.field}>
          <label>Confirm Password <span className={styles.required}>*</span></label>
          <div className={styles.pwdWrap}>
            <input className={`input-field ${fieldErrors.confirm ? styles.inputError : ''}`}
              type={showConfirm ? 'text' : 'password'} placeholder="Repeat password" value={confirm}
              onChange={e => { setConfirm(e.target.value); setFieldErrors(p => ({ ...p, confirm: '' })); setServerError(null) }}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(p => !p)}>
              {showConfirm ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>
          <FieldError msg={fieldErrors.confirm} />
        </div>

        {serverError && (
          <Banner error={serverError} onGoogle={handleGoogle} onGitHub={handleGitHub}
            onSwitchToLogin={onSwitch} onSwitchToRegister={() => setServerError(null)} />
        )}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? <><span className={styles.spinner} /> Creating account…</> : 'Create Account'}
        </button>
      </form>

      <div className={styles.orDivider}><span>or</span></div>
      <button className={styles.socialBtn} onClick={handleGoogle}><GoogleIcon /> Sign up with Google</button>
      <button className={styles.socialBtn} onClick={handleGitHub}><GitHubIcon /> Sign up with GitHub</button>

      {oauthError && (
        <Banner error={oauthError} onGoogle={handleGoogle} onGitHub={handleGitHub}
          onSwitchToLogin={onSwitch} onSwitchToRegister={() => setOauthError(null)} />
      )}

      <p className={styles.switchText}>
        Already have an account? <button className={styles.switchBtn} onClick={onSwitch}>Sign in</button>
      </p>
    </ModalShell>
  )
}
