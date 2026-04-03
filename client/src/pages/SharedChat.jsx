import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, MessageSquare } from 'lucide-react'
import MessageBubble from '../components/chat/MessageBubble'
import { Spinner } from '../components/ui/Spinner'

export default function SharedChat() {
  const { token }  = useParams()
  const navigate   = useNavigate()

  const [conv,    setConv]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return }
    fetch(`/api/share/${token}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'This link is no longer active.' : 'Failed to load conversation.')
        return r.json()
      })
      .then(data => { setConv(data.conversation); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [token])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary, #080810)' }}>
      <Spinner size={32} />
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary, #080810)', padding: 24, textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,92,92,0.1)', border: '1px solid rgba(255,92,92,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <MessageSquare size={22} color="var(--red, #ff5c5c)" />
      </div>
      <h2 style={{ color: 'var(--text-primary, #fff)', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px' }}>Link unavailable</h2>
      <p style={{ color: 'var(--text-muted, #666)', fontSize: '0.88rem', margin: '0 0 24px', maxWidth: 320 }}>{error}</p>
      <button
        onClick={() => navigate('/')}
        style={{ padding: '9px 22px', borderRadius: 10, background: 'var(--purple, #9d6fff)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
      >
        Go to NexusAI
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #080810)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        background: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border, rgba(255,255,255,0.07))',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg,var(--purple,#9d6fff),#6b3fd4)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>N</div>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #fff)' }}>NexusAI</span>
          <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(157,111,255,0.1)', border: '1px solid rgba(157,111,255,0.2)', color: 'var(--purple, #9d6fff)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            SHARED
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/signup')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 10,
            background: 'var(--purple, #9d6fff)', border: 'none',
            color: '#fff', fontWeight: 700, fontSize: '0.82rem',
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Try NexusAI <ArrowRight size={13} />
        </button>
      </header>

      {/* ── Conversation ── */}
      <main style={{ flex: 1, maxWidth: 740, width: '100%', margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* Title */}
        {conv?.title && conv.title !== 'New Conversation' && (
          <h1 style={{
            color: 'var(--text-primary, #fff)',
            fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
            fontWeight: 700, letterSpacing: '-0.03em',
            margin: '0 0 28px', lineHeight: 1.3,
          }}>
            {conv.title}
          </h1>
        )}

        {/* Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {conv?.messages?.map((msg, i) => (
            <MessageBubble
              key={msg._id || i}
              message={msg}
              isStreaming={false}
              onRetry={undefined}
              onEdit={undefined}
            />
          ))}
        </div>

        {/* Bottom CTA banner */}
        <div style={{
          marginTop: 48,
          padding: '20px 24px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(157,111,255,0.08), rgba(107,63,212,0.04))',
          border: '1px solid rgba(157,111,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary, #fff)' }}>
              Start chatting with NexusAI
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #666)' }}>
              Free to use · No credit card needed · Powered by Groq
            </p>
          </div>
          <button
            onClick={() => navigate('/signup')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 10,
              background: 'var(--purple, #9d6fff)', border: 'none',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Try NexusAI free <ArrowRight size={14} />
          </button>
        </div>
      </main>
    </div>
  )
}
