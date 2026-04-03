import { useState } from 'react'
import { HelpCircle, ChevronDown, MessageSquare, Zap, CreditCard, Shield, Send, Image } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { useRef } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useSidebar } from '../context/SidebarContext'

const FAQ_GROUPS = [
  {

    label: 'Chat & Models',
    items: [
      { q: 'Which AI models are available?', a: 'NexusAI offers Llama 3.1 8B (fast, free), Gemma 2 9B (balanced, free), and Llama 3.3 70B (most powerful, Pro only).' },
      { q: 'How do I use the System Prompt?', a: 'Go to Settings → System Prompt, write your custom instructions, and save. Then toggle it ON/OFF using the System Prompt button in the chat input bar.' },
      { q: 'Can I upload images and documents?', a: 'Yes! Click the paperclip icon in the chat input to attach images (JPG, PNG, WEBP) or documents (PDF, TXT, MD). Then ask questions about them.' },
      { q: 'How does AI Memory work?', a: 'Go to Settings → System Prompt → AI Memory to add facts about yourself (like your role or preferences). NexusAI will reference these in every conversation.' },
      { q: 'What is the daily message limit?', a: 'Free users get 20 messages per day. Pro users get 500 messages per day. Your limit resets at midnight.' },
    ],
  },
  {

    label: 'File Uploads',
    items: [
      { q: 'What image formats are supported?', a: 'JPEG, PNG, WEBP, and GIF images are supported. You can attach multiple images per message.' },
      { q: 'What document formats can I upload?', a: 'PDF, TXT, and Markdown (.md) files are supported for document uploads.' },
      { q: 'How large can my uploads be?', a: 'Images are processed inline. Keep files under 10MB for best performance.' },
      { q: 'Can I ask questions about uploaded files?', a: 'Yes! Attach your image or document, then type your question. NexusAI will analyze the content and answer accordingly.' },
    ],
  },
  {

    label: 'Pro Plan',
    items: [
      { q: 'What does Pro include?', a: 'Pro gives you 500 messages/day, access to Llama 3.3 70B (the most capable model), and priority response times.' },
      { q: 'How do I upgrade to Pro?', a: 'Go to the Upgrade page from the sidebar or click "Upgrade to Pro" anywhere in the app. We use Razorpay for secure payments.' },
      { q: 'Can I downgrade back to free?', a: "Yes, contact support and we'll process your downgrade. Your data is always preserved." },
    ],
  },
  {

    label: 'Billing & Payments',
    items: [
      { q: 'What payment methods are accepted?', a: 'We accept UPI, credit/debit cards, net banking, and wallets via Razorpay.' },
      { q: 'Is my payment information secure?', a: 'Yes. All payments are processed by Razorpay, a PCI-DSS compliant payment gateway. We never store your card details.' },
      { q: 'Where can I see my payment history?', a: 'Go to Settings → Billing to view all your past payments and their status.' },
    ],
  },
  {
    label: 'Account & Privacy',
    items: [
      { q: 'How do I change my password?', a: 'Go to Settings → Profile → Change Password. For OAuth accounts (Google/GitHub), password change is managed by your OAuth provider.' },
      { q: 'Can I delete my account?', a: 'Yes. Go to Settings → Danger Zone → Delete Account. This permanently deletes all your data and cannot be undone.' },
      { q: 'How is my data used?', a: 'Your conversations are stored to provide continuity. We never sell your data. You can delete all your data at any time from Settings.' },
      { q: "Is my data shared with AI providers?", a: "Messages are sent to Groq's API for processing. Groq's privacy policy governs how they handle this data." },
    ],
  },
]

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(p => !p)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-primary)', textAlign: 'left', gap: 12,
      }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{q}</span>
        <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ paddingBottom: 14, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {a}
        </div>
      )}
    </div>
  )
}

// Validation rules in order — first failing rule is shown
const RULES = [
  { field: 'name',    check: v => v.trim().length < 3,            msg: 'Name must be at least 3 characters' },
  { field: 'email',   check: v => !/\S+@\S+\.\S+/.test(v.trim()), msg: 'Enter a valid email address' },
  { field: 'subject', check: v => v.trim().length < 3,            msg: 'Subject must be at least 3 characters' },
  { field: 'message', check: v => v.trim().length < 3,            msg: 'Message must be at least 3 characters' },
]

function getFirstError(form) {
  for (const rule of RULES) {
    if (rule.check(form[rule.field])) return rule
  }
  return null
}

export default function Help() {
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed,
          open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
  const sidebarRef = useRef(null)
  const navigate   = useNavigate()

  const [form,    setForm]    = useState({ name: '', email: '', category: 'General', subject: '', message: '' })
  const [error,   setError]   = useState({ field: '', msg: '' })   // single error at a time
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

const handleChange = (field, value) => {
  const newForm = { ...form, [field]: value }
  setForm(newForm)
  // Only clear error if the user fixed the currently shown error field
  if (error.field === field) {
    const firstError = getFirstError(newForm)
    if (!firstError || firstError.field !== field) {
      setError({ field: '', msg: '' })
    }
  }
}

  const handleSubmit = async () => {
    const firstError = getFirstError(form)
  if (firstError) {
    setError({ field: firstError.field, msg: firstError.msg })
    return
  }
    setError({ field: '', msg: '' })
    setSending(true)
    try {
      await api.post('/support/contact', form)
      setSent(true)
      toast.success("Message sent! We'll get back to you soon.")
    } catch {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

const borderColor = (field) => {
  if (error.field === field) return '#ff5555'
  return ''
}
  return (
    <div className="app-shell">
      <Sidebar
        ref={sidebarRef}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      <div className="main-content">
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(12px)', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)} className="hide-desktop" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 6 }}>
            <span style={{ fontSize: 18 }}>☰</span>
          </button>
          <HelpCircle size={15} color="var(--text-muted)" />
          <h1 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>Help & Support</h1>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>

            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>How can we help?</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Browse the FAQ or send us a message below</p>
            </div>

            {/* FAQ Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
              {FAQ_GROUPS.map(({ icon: Icon, color, bg, border, label, items }) => (
                <div key={label} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--green)' }}>{label}</span>
                  </div>
                  <div style={{ padding: '0 18px' }}>
                    {items.map(item => <AccordionItem key={item.q} {...item} />)}
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Form */}
            <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 28 }}>

              <p style={{ fontSize: '0.62rem', color: 'var(--green)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                Send us a message
              </p>

              {sent ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,208,132,0.1)', border: '1px solid rgba(0,208,132,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Send size={22} color="var(--green)" />
                  </div>
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Message sent Successfully!</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 16 }}>
                    We'll get back to you at <strong style={{ color: 'var(--green)' }}>{form.email}</strong> within 24 hours.
                  </p>
                  <button
                    onClick={() => { setSent(false); setForm({ name: '', email: '', category: 'General', subject: '', message: '' }); setError({ field: '', msg: '' });setTouched({})}}
                    className="btn btn-ghost"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <div>

                  {/* Name + Email */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 6 }}>
                        Your Name <span style={{ color: '#ff5555' }}>*</span>
                      </label>
                      <input
                        className="input-field"
                        placeholder="Ravibhushan Kumar"
                        value={form.name}
                        onChange={e => handleChange('name', e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', borderColor: borderColor('name') }}
                      />
                      {error.field === 'name' && (
                        <p style={{ color: '#ff5555', fontSize: '0.72rem', marginTop: 4, marginBottom: 0 }}>{error.msg}</p>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 6 }}>
                        Email Address <span style={{ color: '#ff5555' }}>*</span>
                      </label>
                      <input
                        className="input-field"
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={e => handleChange('email', e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', borderColor: borderColor('email') }}
                      />
                      {error.field === 'email' && (
                        <p style={{ color: '#ff5555', fontSize: '0.72rem', marginTop: 4, marginBottom: 0 }}>{error.msg}</p>
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 6 }}>
                      Category
                    </label>
                    <select
                      className="input-field"
                      value={form.category}
                      onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option>General</option>
                      <option>Chat & Models</option>
                      <option>File Uploads</option>
                      <option>Pro Plan</option>
                      <option>Billing & Payments</option>
                      <option>Account & Privacy</option>
                      <option>Bug Report</option>
                    </select>
                  </div>

                  {/* Subject */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 6 }}>
                      Subject <span style={{ color: '#ff5555' }}>*</span>
                    </label>
                    <input
                      className="input-field"
                      placeholder="Brief description of your issue"
                      value={form.subject}
                      onChange={e => handleChange('subject', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', borderColor: borderColor('subject') }}
                    />
                    {error.field === 'subject' && (
                      <p style={{ color: '#ff5555', fontSize: '0.72rem', marginTop: 4, marginBottom: 0 }}>{error.msg}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 6 }}>
                      Message <span style={{ color: '#ff5555' }}>*</span>
                    </label>
                    <textarea
                      className="input-field"
                      placeholder="Describe your issue in detail…"
                      value={form.message}
                      onChange={e => handleChange('message', e.target.value)}
                      rows={5}
                      style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box', borderColor: borderColor('message') }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      {error.field === 'message'
                        ? <p style={{ color: '#ff5555', fontSize: '0.72rem', margin: 0 }}>{error.msg}</p>
                        : <span />
                      }

                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: '0.9rem', opacity: sending ? 0.7 : 1 }}
                  >
                    {sending
                      ? <><span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 8 }} />Sending…</>
                      : <>Send message</>
                    }
                  </button>

                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
