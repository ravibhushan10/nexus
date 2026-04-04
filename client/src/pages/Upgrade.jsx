import { useState, useRef } from 'react'
import { Check, Crown, Zap, Menu, X, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Spinner } from '../components/ui/Spinner'
import { useSidebar } from '../context/SidebarContext'

const FREE_FEATURES = [
  '20 messages per day',
  'Llama 3 8B model',
  'Chat history & pinning',
  'Analytics dashboard',
  'Prompt templates',
  'AI memory',
]

const PRO_FEATURES = [
  '500 messages per day',
  'Llama 3.3 70B model',
  'Everything in Free',
  'Priority Groq processing',
  'Longer context (4K tokens)',
  'Export conversations',
  'Priority support',
]

const MONTHLY_PRICE = 10
const ANNUAL_PRICE  = 50

function calcBreakdown(base) {
  const gatewayFee = Math.round(base * 0.02)
  const gst        = Math.round(gatewayFee * 0.18)
  return { base, gatewayFee, gst, total: base + gatewayFee + gst }
}

export default function Upgrade() {
  const { user, updateUser } = useAuth()
  const [loading,   setLoading]   = useState(false)
  const [billing,   setBilling]   = useState('monthly')
  const [showModal, setShowModal] = useState(false)

  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed,
          open: sidebarOpen,           setOpen: setSidebarOpen } = useSidebar()
  const sidebarRef = useRef(null)
  const navigate   = useNavigate()
  const isPro      = user?.plan === 'pro'

  const isAnnual = billing === 'annual'
  const bd       = calcBreakdown(isAnnual ? ANNUAL_PRICE : MONTHLY_PRICE)

  // ── Open modal (no loading on upgrade page) ───────────────────────────
  const handleUpgradeClick = () => { if (!loading) setShowModal(true) }

  // ── Pay button inside modal ───────────────────────────────────────────
  const handleConfirmPay = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/payment/create-order', { plan: 'pro', billing })

      const options = {
        key:         data.keyId,
        amount:      data.amount,
        currency:    data.currency,
        name:        'NexusAI',
        description: isAnnual ? 'Pro Plan — Annual Subscription' : 'Pro Plan — Monthly Subscription',
        order_id:    data.orderId,
        prefill:     { name: data.user.name, email: data.user.email },
        theme:       { color: '#00d084' },
        handler: async (response) => {
          try {
            await api.post('/payment/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            })
            updateUser({ plan: 'pro' })
            setShowModal(false)
            toast.success('🎉 Welcome to Pro!')
            navigate('/chat')
          } catch {
            setLoading(false)
            toast.error('Payment verification failed. Contact support.')
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            // modal stays open so user can retry
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.')
        setLoading(false)
      })
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not initiate payment')
      setLoading(false)
    }
  }

  const handleDowngrade = async () => {
    if (!confirm('Downgrade to Free plan? You will lose Pro features at end of billing period.')) return
    try {
      await api.post('/payment/downgrade')
      updateUser({ plan: 'free' })
      toast.success('Downgraded to Free plan')
    } catch { toast.error('Failed') }
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

      <div className="main-content" style={{ overflowY: 'auto' }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
          <button onClick={() => setSidebarOpen(true)} className="hide-desktop" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 'var(--r-sm)' }}>
            <Menu size={18} />
          </button>
          <Crown size={15} color="var(--orange)" />
          <h1 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>Upgrade to Pro</h1>
        </header>

        <div style={{ padding: 32 }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>

            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', marginBottom: 8 }}>Unlock Full Power</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', maxWidth: 380, margin: '0 auto' }}>
                25× more messages, Llama 3.3 70B access, and priority features for your AI workflow.
              </p>
            </div>

            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>

              {/* Free */}
              <div className="glass-card" style={{ padding: 22 }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 6 }}>FREE</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>₹0</p>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 18 }}>Forever free</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
                  {FREE_FEATURES.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Check size={12} color="var(--text-muted)" /> {f}
                    </div>
                  ))}
                </div>
                {isPro
                  ? <button onClick={handleDowngrade} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', padding: '9px' }}>Downgrade to Free</button>
                  : <button disabled className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '9px', opacity: 0.5, cursor: 'default' }}>Current Plan</button>
                }
              </div>

              {/* Pro */}
              <div className="glass-card" style={{ padding: 22, borderColor: 'rgba(0,208,132,0.3)', background: 'rgba(0,208,132,0.03)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: 'var(--green)', color: '#000', fontSize: '0.68rem', fontWeight: 700, padding: '2px 12px', borderRadius: 100, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </div>

                <p style={{ fontSize: '0.68rem', color: 'var(--orange)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 10 }}>PRO</p>

                {/* Billing Toggle */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, marginBottom: 14, gap: 2 }}>
                  {[{ key: 'monthly', label: '1 MONTH' }, { key: 'annual', label: '1 YEAR' }].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setBilling(key)}
                      style={{
                        flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
                        transition: 'all 0.2s',
                        background: billing === key ? 'var(--green)' : 'transparent',
                        color:      billing === key ? '#000'         : 'var(--text-muted)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Price */}
                <div style={{ marginBottom: 2 }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
                    ₹{isAnnual ? ANNUAL_PRICE : MONTHLY_PRICE}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: 4 }}>
                    /{isAnnual ? 'year' : 'month'}
                  </span>
                </div>

                <p style={{ fontSize: '0.72rem', color: isAnnual ? 'var(--green)' : 'var(--text-muted)', marginBottom: 14, minHeight: 18 }}>
                  {isAnnual ? `~₹${Math.round(ANNUAL_PRICE / 12)}/mo · Save ${Math.round((1 - ANNUAL_PRICE / (MONTHLY_PRICE * 12)) * 100)}%` : 'Billed monthly'}
                </p>

                {isAnnual && (
                  <div style={{ display: 'inline-block', background: 'rgba(0,208,132,0.15)', color: 'var(--green)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100, fontFamily: 'var(--font-mono)', marginBottom: 12, letterSpacing: '0.08em' }}>
                    BEST VALUE
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
                  {PRO_FEATURES.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Check size={12} color="var(--green)" /> {f}
                    </div>
                  ))}
                </div>

                {/* ── Unified button — same style, label reflects billing ── */}
                {isPro
                  ? <button disabled className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '9px', opacity: 0.6, cursor: 'default' }}>Current Plan</button>
                  : <button onClick={handleUpgradeClick} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '9px' }}>

                      {isAnnual ? `Continue with ₹${ANNUAL_PRICE}/year` : `Continue with ₹${MONTHLY_PRICE}/month`}
                    </button>
                }
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Order Details Modal ── */}
      {showModal && (
        <div
          onClick={() => { if (!loading) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0e0e1a', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 400, padding: 28, position: 'relative' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <button
                onClick={() => { if (!loading) setShowModal(false) }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: loading ? 'default' : 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, padding: 0, opacity: loading ? 0.4 : 1 }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={() => { if (!loading) setShowModal(false) }}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: loading ? 'default' : 'pointer', padding: 4, opacity: loading ? 0.4 : 1 }}
              >
                <X size={16} />
              </button>
            </div>

            <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 4 }}>Order Details</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 20 }}>Review your order before payment</p>

            {/* User info */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Name</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.82rem' }}>{user?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Email</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.82rem', wordBreak: 'break-all', textAlign: 'right', maxWidth: '65%' }}>{user?.email}</span>
              </div>
            </div>

            {/* Price Breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>Pro Plan</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0 }}>{isAnnual ? 'Annually' : 'Monthly'}</p>
                </div>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.88rem' }}>₹{bd.base}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Payment gateway fee</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', margin: 0 }}>2% charged by Razorpay</p>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>₹{bd.gatewayFee}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>GST on gateway fee</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', margin: 0 }}>18% on gateway fee</p>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>₹{bd.gst}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.92rem' }}>Total</span>
                <span style={{ color: 'var(--green)', fontWeight: 800, fontSize: '0.92rem' }}>₹{bd.total}</span>
              </div>
            </div>

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: 16 }}>
              Secured by Razorpay · Pay via Card, UPI, NetBanking &amp; more
            </p>

            {/* ── Pay button — spinner lives HERE, not on upgrade page ── */}
            <button
              onClick={handleConfirmPay}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.9rem', fontWeight: 700 }}
            >
              {loading
                ? <><Spinner size={14} /> Processing Payment…</>
                : <>Continue to Pay ₹{bd.total}</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
