import { useState, useEffect, useRef } from 'react'
import {
  Settings as SettingsIcon, User, Brain, Shield,
  X, Menu, Eye, EyeOff, Crown, Zap, Trash2, Camera,
} from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Spinner } from '../components/ui/Spinner'
import { useSidebar } from '../context/SidebarContext'


const TABS = [
  { id: 'profile',      label: 'Profile' },
  { id: 'systemprompt', label: 'System Prompt' },
  { id: 'billing',      label: 'Billing' },
  { id: 'danger',       label: 'Danger Zone' },
]

const lbl = { display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }
const card = { padding: '16px 20px', borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', border: '1px solid var(--border)' }

export default function Settings() {
  const { user, logout, updateUser } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed,
          open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
  const sidebarRef = useRef(null)

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'profile')

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
          <button onClick={() => setSidebarOpen(true)} className="hide-desktop" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 'var(--r-sm)' }}>
            <Menu size={18} />
          </button>
          <SettingsIcon size={15} color="var(--text-muted)" />
          <h1 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>Settings</h1>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: 176, padding: '10px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
            {TABS.map(({ id, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`sidebar-item ${activeTab === id ? 'active' : ''}`}
                style={{ color: id === 'danger' && activeTab !== id ? 'var(--red)' : undefined }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              {activeTab === 'profile'      && <ProfileTab      user={user} updateUser={updateUser} />}
              {activeTab === 'systemprompt' && <SystemPromptTab user={user} updateUser={updateUser} />}
              {activeTab === 'billing'      && <BillingTab      user={user} />}
              {activeTab === 'danger'       && <DangerTab       logout={logout} navigate={navigate} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</h2>
      {sub && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

// ── Profile Tab — with avatar upload ────────────────────────────────────────
function ProfileTab({ user, updateUser }) {
  const [name,          setName]          = useState(user?.name || '')
  const [saving,        setSaving]        = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const avatarRef = useRef(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  const save = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty')
    setSaving(true)
    try {
      const { data } = await api.put('/auth/profile', { name })
      updateUser({ name: data.user.name })
      toast.success('Profile updated!')
    } catch { toast.error('Failed to update') }
    finally { setSaving(false) }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Only image files allowed')
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB')
    setAvatarLoading(true)
    const form = new FormData()
    form.append('avatar', file)
    try {
      const { data } = await api.post('/auth/avatar', form)
      updateUser({ avatar: data.avatar })
      toast.success('Avatar updated!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setAvatarLoading(false)
      e.target.value = ''
    }
  }

  const avatarUrl = user?.avatar ? `${API_URL}${user.avatar}` : null
  const initials  = user?.name?.[0]?.toUpperCase() || '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead title="Profile" sub="Manage your personal information" />

      {/* Avatar + info card */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Avatar with upload overlay */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,var(--purple),#6b3fd4)',
            border: '2px solid var(--border)', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '1.4rem',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initials}
          </div>
          <button onClick={() => avatarRef.current?.click()} title="Change avatar"
            style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--text-muted)', border: '2px solid var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}>
            {avatarLoading ? <Spinner size={10} /> : <Camera size={10} />}
          </button>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
        </div>
        <div>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{user?.name}</p>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0' }}>{user?.email}</p>
          {user?.plan === 'pro'
            ? <span style={{ fontSize: '0.7rem', color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}> Pro Plan</span>
            : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2, display: 'block' }}>Free Plan</span>
          }
        </div>
      </div>

      <div>
        <label style={lbl}>Display Name</label>
        <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
      </div>
      <div>
        <label style={lbl}>Email Address</label>
        <input className="input-field" value={user?.email || ''} readOnly />
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 5 }}>Email cannot be changed</p>
      </div>

      <div style={card}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>USAGE SUMMARY</p>
        {[
          ['Total Messages',  (user?.usage?.totalMessages   || 0).toLocaleString()],
          ['Tokens Used',     (user?.usage?.totalTokensUsed || 0).toLocaleString()],
          ['Total API Cost',  `$${(user?.usage?.totalCost   || 0).toFixed(4)}`],
        ].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{l}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving || name === user?.name} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── System Prompt Tab — FIXED: saves to MongoDB, not localStorage ────────────
function SystemPromptTab({ user, updateUser }) {
  const [systemPrompt, setSystemPrompt] = useState(user?.systemPrompt || '')
  const [saving,       setSaving]       = useState(false)

  // Sync if user object updates
  useEffect(() => { setSystemPrompt(user?.systemPrompt || '') }, [user?.systemPrompt])

  const savePrompt = async () => {
    setSaving(true)
    try {
      const { data } = await api.put('/auth/system-prompt', { systemPrompt })
      updateUser({ systemPrompt: data.systemPrompt })
      toast.success('System prompt saved!')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const resetPrompt = async () => {
    setSystemPrompt('')
    try {
      await api.put('/auth/system-prompt', { systemPrompt: '' })
      updateUser({ systemPrompt: '' })
      toast.success('Reset to default')
    } catch { toast.error('Failed to reset') }
  }

  // AI Memory
  const [memories,  setMemories] = useState(user?.memory || [])
  const [adding,    setAdding]   = useState(false)
  const [newKey,    setNewKey]   = useState('')
  const [newVal,    setNewVal]   = useState('')

  const addMemory = async () => {
    if (!newKey.trim() || !newVal.trim()) return toast.error('Fill both fields')
    try {
      const { data } = await api.post('/chat/memory', { key: newKey.trim(), value: newVal.trim() })
      setMemories(data.memory)
      setAdding(false); setNewKey(''); setNewVal('')
      toast.success('Memory saved!')
    } catch { toast.error('Failed to save') }
  }

  const deleteMemory = async (key) => {
    try {
      const { data } = await api.delete(`/chat/memory/${encodeURIComponent(key)}`)
      setMemories(data.memory)
      toast.success('Deleted')
    } catch { toast.error('Failed') }
  }

  const promptActive = systemPrompt.trim().length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead title="System Prompt" sub="Customize NexusAI's behavior. Saved to your account — works on any device." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>Default Prompt</p>
          <span style={{ padding: '2px 10px', borderRadius: 100, background: promptActive ? 'rgba(157,111,255,0.15)' : 'var(--border)', color: promptActive ? 'var(--green)' : 'var(--text-muted)', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
            {promptActive ? 'SET' : 'NOT SET'}
          </span>
        </div>
        <div style={card}>
          <textarea
            className="input-field"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant specialized in…"
            rows={10}
            style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Saved to your account — available on any device. Toggle it on/off using the <strong style={{ color: 'var(--green)' }}>System Prompt</strong> button in the chat bar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={resetPrompt} className="btn btn-ghost">Reset</button>
          <button onClick={savePrompt} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save Prompt'}
          </button>
        </div>
      </div>

      {/* AI Memory */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI Memory</p>
          <button onClick={() => setAdding(p => !p)} className="btn btn-ghost btn-sm">+ Add</button>
        </div>

        {adding && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input-field" placeholder="Key (e.g. Role)" value={newKey} onChange={e => setNewKey(e.target.value)} />
            <input className="input-field" placeholder="Value (e.g. Full-stack developer)" value={newVal} onChange={e => setNewVal(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setAdding(false); setNewKey(''); setNewVal('') }} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={addMemory} className="btn btn-primary btn-sm">Save</button>
            </div>
          </div>
        )}

        {memories.length === 0 && !adding ? (
          <div style={{ ...card, textAlign: 'center', padding: '24px' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No memories yet. Add facts about yourself to personalize responses.</p>
          </div>
        ) : memories.map(m => (
          <div key={m.key} style={{ ...card, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{m.key}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>{m.value}</p>
            </div>
            <button onClick={() => deleteMemory(m.key)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function BillingTab({ user }) {
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.get('/payment/history')
      .then(r => setPayments(r.data.payments))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const used  = user?.usage?.messagesToday || 0
  const limit = user?.plan === 'pro' ? 500 : 20
  const pct   = Math.min(100, (used / limit) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead title="Billing" sub="Manage your plan and payment history" />

      <div style={{ ...card, background: user?.plan === 'pro' ? 'rgba(0,208,132,0.04)' : 'var(--bg-card)', borderColor: user?.plan === 'pro' ? 'rgba(0,208,132,0.2)' : 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>

            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</span>
          </div>
          {user?.plan === 'free' && <Link to="/upgrade" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}> Upgrade</Link>}
        </div>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          {user?.plan === 'pro' ? '₹999/month · 500 messages/day · Llama 3.3 70B' : 'Free forever · 20 messages/day · Llama 3.1 8B'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)' }}>Messages today</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{used}/{limit}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%`, background: pct > 80 ? 'var(--orange)' : 'var(--green)' }} />
        </div>
      </div>

      <div>
        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Payment History</p>
        {loading ? [1, 2].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--r-lg)', marginBottom: 6 }} />) :
          payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.83rem' }}>No payments yet</p>
            </div>
          ) : payments.map(p => (
            <div key={p._id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize', margin: 0 }}>{p.plan} Plan</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', margin: '2px 0 0' }}>{p.razorpayPaymentId}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600, margin: 0 }}>₹{(p.amount / 100).toLocaleString()}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{new Date(p.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

function DangerTab({ logout, navigate }) {
  const [clearing, setClearing] = useState(false)
  const [confirm,  setConfirm]  = useState('')

  const clearHistory = async () => {
    if (!window.confirm('Delete ALL conversations? This cannot be undone.')) return
    setClearing(true)
    try { await api.delete('/conversations'); toast.success('All conversations deleted') }
    catch { toast.error('Failed') }
    finally { setClearing(false) }
  }

  const deleteAccount = async () => {
    try {
      await api.delete('/auth/account').catch(() => {})
      logout()
      toast.success('Account deleted')
    } catch { toast.error('Failed to delete account') }
  }

  const isConfirmed = confirm === 'DELETE'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHead title="Danger Zone" sub="These actions are permanent and cannot be undone" />

      {[
        { title: 'Clear Chat History', sub: 'Delete all conversations and messages', action: clearHistory, loading: clearing, btn: 'Clear All' },
        { title: 'Sign Out', sub: 'Sign out of this device', action: logout, btn: 'Sign Out' },
      ].map(({ title, sub, action, loading: ld, btn }) => (
        <div key={title} style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{title}</p>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{sub}</p>
            </div>
            <button onClick={action} disabled={ld} className="btn btn-sm"
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid rgba(255,92,92,0.4)', color: 'var(--red)', borderRadius: 6 }}>
              {ld ? <Spinner size={12} /> : btn}
            </button>
          </div>
        </div>
      ))}

      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <p style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Delete Account</p>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Permanently deletes your account, all conversations, and data. This is irreversible.</p>
        </div>
        <div>
          <label style={{ ...lbl, color: 'var(--text-muted)' }}>
            Type <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>DELETE</span> to confirm
          </label>
          <input className="input-field" placeholder="DELETE" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <button disabled={!isConfirmed} onClick={deleteAccount} style={{
          padding: '10px', background: 'transparent', borderRadius: 6,
          border: isConfirmed ? '1px solid rgba(255,92,92,0.5)' : '1px solid var(--border)',
          color: isConfirmed ? 'var(--red)' : 'var(--text-muted)',
          fontSize: '0.83rem', fontWeight: 600,
          cursor: isConfirmed ? 'pointer' : 'not-allowed',
          opacity: isConfirmed ? 1 : 0.45,
        }}>
          Delete My Account Permanently
        </button>
      </div>
    </div>
  )
}
