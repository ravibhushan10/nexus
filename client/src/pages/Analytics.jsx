import { useState, useEffect, useRef } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { BarChart2, MessageSquare, Cpu, DollarSign, FileText, Menu, Crown, AlertCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { Spinner } from '../components/ui/Spinner'
import { useSidebar } from '../context/SidebarContext'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '8px 14px', fontSize: '0.78rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontFamily: 'var(--font-mono)' }}>
          {p.name}: {p.name === 'cost' ? `$${Number(p.value).toFixed(4)}` : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { user }    = useAuth()
  const sidebarRef  = useRef(null)
 const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed,
        open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  const fetchData = async () => {
    setLoading(true); setError(false)
    try {
      const { data: res } = await api.get('/analytics/overview')
      setData(res)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const stats = data ? [
    { icon: MessageSquare, label: 'Total Messages',    value: data.usage.totalMessages.toLocaleString(),                  color: 'var(--green)',  bg: 'var(--green-dim)',  border: 'rgba(0,208,132,0.2)' },
    { icon: Cpu,           label: 'Tokens Used',       value: (data.usage.totalTokensUsed || 0).toLocaleString(),         color: 'var(--blue)',   bg: 'var(--blue-dim)',   border: 'rgba(77,166,255,0.15)' },
    { icon: DollarSign,    label: 'Total Cost',        value: `$${(data.usage.totalCost || 0).toFixed(4)}`,               color: 'var(--purple)', bg: 'var(--purple-dim)', border: 'rgba(157,111,255,0.15)' },
    { icon: FileText,      label: 'Total Conversations', value: (data.totalConversations || 0).toLocaleString(),           color: 'var(--orange)', bg: 'var(--orange-dim)', border: 'rgba(255,159,67,0.2)' },
  ] : []

  return (
    <div className="app-shell">
      <Sidebar
        ref={sidebarRef}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      <div className="main-content" style={{ overflowY: 'auto' }}>
        {/* No bottom border */}
        <header style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)',gap: 12, padding: '9px 20px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(true)} className="hide-desktop" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 'var(--r-sm)' }}>
            <Menu size={18} />
          </button>
          <BarChart2 size={15} color="var(--green)" />
          <h1 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>Analytics</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={fetchData} disabled={loading}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 6, borderRadius: 'var(--r-sm)', transition: 'var(--ease)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              title="Refresh"
            >
              {loading ? <Spinner size={15} /> : <RefreshCw size={15} />}
            </button>
          </div>
        </header>

        <div style={{ padding: 24 }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {!loading && data && user?.plan === 'free' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderRadius: 'var(--r-lg)', background: 'var(--orange-dim)', border: '1px solid rgba(255,159,67,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                  <span style={{ fontSize: '0.83rem', color: 'var(--orange)', fontWeight: 500 }}>
                    Free Plan — {data.limits.remaining} messages remaining today
                  </span>
                </div>
                <Link to="/upgrade" style={{ fontSize: '0.76rem', color: 'var(--orange)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Upgrade →</Link>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12, color: 'var(--text-muted)' }}>
                <AlertCircle size={32} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.88rem' }}>Failed to load analytics</p>
                <button onClick={fetchData} className="btn btn-ghost btn-sm"><RefreshCw size={12} /> Try again</button>
              </div>
            )}

            {!error && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {loading
                  ? [1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 'var(--r-lg)' }} />)
                  : stats.map(({ icon: Icon, label, value, color, bg, border }) => (
                    <div key={label} className="animate-fade-in" style={{ padding: '18px 20px', borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <Icon size={15} color={color} />
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{label}</p>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono)' }}>{value}</p>
                    </div>
                  ))
                }
              </div>
            )}

            {loading && !error && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="skeleton" style={{ height: 220, borderRadius: 'var(--r-lg)' }} />
                <div className="skeleton" style={{ height: 220, borderRadius: 'var(--r-lg)' }} />
              </div>
            )}

            {!loading && !error && data && (
              <>
                <div style={{ padding: 20, borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Messages — Last 7 days</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
                    {data.totalConversations} total conversation{data.totalConversations !== 1 ? 's' : ''}
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={data.dailyStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#00d084" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#00d084" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="messages" name="messages" stroke="#00d084" strokeWidth={2} fill="url(#msgGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ padding: 20, borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Tokens — Last 7 days</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
                    {(data.usage.totalTokensUsed || 0).toLocaleString()} total tokens used
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.dailyStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="tokens" name="tokens" fill="rgba(77,166,255,0.6)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Plan',      value: user?.plan === 'pro' ? 'Pro' : 'Free', mono: true },
                    { label: 'Today',     value: `${data.usage.messagesToday || 0} / ${data.limits.messagesPerDay}`, mono: true },

                  ].map(({ label, value, mono }) => (
                    <div key={label} style={{ padding: '14px 16px', borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>{label}</p>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
