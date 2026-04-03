import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  MessageSquare, FileText, BarChart2, Settings, LogOut,
  Plus, Crown, Pin, Trash2, Edit3, X, MoreHorizontal, Search,
  ChevronRight, PanelLeftClose, PanelLeftOpen,
  Globe, HelpCircle, Zap,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const NAV = [

  { icon: BarChart2, label: 'Analytics', path: '/analytics' },
]

/* ── Same tooltip style as MessageBubble — dark box, right side for sidebar ── */
function SidebarTooltip({ label, show }) {
  if (!label) return null
  return (
    <div style={{
      position: 'absolute',
      left: 'calc(100% + 10px)',
      top: '50%',
      transform: 'translateY(-50%)',
      background: '#1a1a1a',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '4px 10px',
      fontSize: '0.7rem',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      zIndex: 100,
      pointerEvents: 'none',
      fontFamily: 'var(--font-mono)',
      opacity: show ? 1 : 0,
      visibility: show ? 'visible' : 'hidden',
      transition: 'none',
    }}>
      {label}
    </div>
  )
}

/* ── Collapsed sidebar icon button with tooltip ── */
function CollapsedBtn({ onClick, tooltip, children, active, style: extraStyle }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        width: 36, height: 36,
        borderRadius: 'var(--r-md)',
        background: active ? 'var(--green-dim)' : hov ? 'var(--bg-hover)' : 'none',
        border: active ? '1px solid rgba(0,208,132,0.2)' : '1px solid transparent',
        color: active ? 'var(--green)' : hov ? 'var(--text-primary)' : 'var(--text-muted)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0s, color 0s, border-color 0s',
        flexShrink: 0,
        ...extraStyle,
      }}
    >
      {children}
      <SidebarTooltip label={tooltip} show={hov} />
    </button>
  )
}

const Sidebar = forwardRef(function Sidebar(
  { open, onClose, activeConvId, onConvSelect, collapsed, onToggleCollapse }, ref
) {
  const { user, logout }  = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()
  const [conversations, setConversations] = useState([])
  const [search,        setSearch]        = useState('')
  const [editingId,     setEditingId]     = useState(null)
  const [editTitle,     setEditTitle]     = useState('')
  const [menuId,        setMenuId]        = useState(null)
  const [profileOpen,   setProfileOpen]   = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/conversations')
      setConversations(data.conversations)
    } catch {}
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])
  useImperativeHandle(ref, () => ({ refresh: fetchConversations }), [fetchConversations])

  useEffect(() => {
    if (!menuId && !profileOpen) return
    const close = () => { setMenuId(null); setProfileOpen(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuId, profileOpen])

  const handleNew = () => { navigate('/chat'); onClose?.() }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    try {
      await api.delete(`/conversations/${id}`)
      setConversations(prev => prev.filter(c => c._id !== id))
      if (activeConvId === id) navigate('/chat')
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
    setMenuId(null)
  }

  const handleRename = async (id) => {
    if (!editTitle.trim()) return
    try {
      await api.put(`/conversations/${id}/rename`, { title: editTitle.trim() })
      setConversations(prev => prev.map(c => c._id === id ? { ...c, title: editTitle.trim() } : c))
    } catch { toast.error('Failed to rename') }
    setEditingId(null)
  }

  const handlePin = async (e, id) => {
    e.stopPropagation()
    try {
      const { data } = await api.put(`/conversations/${id}/pin`)
      setConversations(prev => prev.map(c => c._id === id ? { ...c, isPinned: data.isPinned } : c))
    } catch {}
    setMenuId(null)
  }

  const limit    = user?.plan === 'pro' ? 500 : 20
  const used     = user?.usage?.messagesToday || 0
  const pct      = Math.min(100, (used / limit) * 100)
  const filtered = conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
  const pinned   = filtered.filter(c => c.isPinned)
  const recent   = filtered.filter(c => !c.isPinned)

  // ─────────────────────────────────────────────────────────────────────────
  // COLLAPSED SIDEBAR — all icons have tooltips
  // ─────────────────────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside style={{
        width: 56,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        flexShrink: 0, height: '100vh',
        alignItems: 'center',
        paddingTop: 10, paddingBottom: 10,
        gap: 2, zIndex: 40,
        position: 'relative',
        overflow: 'visible',   // let tooltips escape the sidebar
      }}>

        {/* Expand */}
        <CollapsedBtn onClick={onToggleCollapse} tooltip="Expand sidebar" style={{ marginBottom: 4 }}>
          <PanelLeftOpen size={16} />
        </CollapsedBtn>

        {/* New Chat */}
        <CollapsedBtn
          onClick={() => navigate('/chat')}
          tooltip="New Chat"
          style={{
            border: '1px solid var(--border)',
            marginBottom: 6,
          }}
        >
          <Plus size={15} />
        </CollapsedBtn>

        {/* Nav icons */}
        {NAV.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname.startsWith(path)
          return (
            <CollapsedBtn
              key={path}
              onClick={() => navigate(path)}
              tooltip={label}
              active={isActive}
              style={{ marginBottom: 2 }}
            >
              <Icon size={16} />
            </CollapsedBtn>
          )
        })}

        <div style={{ flex: 1 }} />

        {/* Profile popup — appears above avatar */}
        {profileOpen && (
          <div
            onClick={e => e.stopPropagation()}
            className="animate-slide-up"
            style={{
              position: 'absolute', bottom: 56, left: 8,
              width: 220,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
              zIndex: 100,
            }}
          >
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
            <div style={{ padding: 6 }}>
              {[
                { icon: Settings,   label: 'Settings', action: () => { navigate('/settings'); setProfileOpen(false) } },
                { icon: Globe, label: 'Language', action: () => { toast('🌐 Language settings coming soon!', { icon: '🌐' }); setProfileOpen(false) } },
                { icon: HelpCircle, label: 'Help', action: () => { navigate('/help'); setProfileOpen(false) } },
              ].map(({ icon: Icon, label: lbl, action }) => (
                <button key={lbl} onClick={action}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', transition: 'var(--ease)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  <Icon size={14} /> {lbl}
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              {user?.plan === 'free' && (
                <button onClick={() => { navigate('/upgrade'); setProfileOpen(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', fontSize: '0.82rem', color: 'var(--orange)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', transition: 'var(--ease)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-dim)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Zap size={14} /> Upgrade plan
                </button>
              )}
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              <button onClick={() => { logout(); setProfileOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', fontSize: '0.82rem', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', transition: 'var(--ease)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--red-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          </div>
        )}

        {/* Avatar with tooltip */}
       <CollapsedBtn
  onClick={e => { e.stopPropagation(); setProfileOpen(p => !p) }}
  tooltip="Profile"
  style={{
    width: 32, height: 32,
    borderRadius: '50%',
    background: 'var(--green-dim)',
    border: '1px solid rgba(0,208,132,0.3)',
    color: 'var(--green)',
    fontWeight: 700, fontSize: '0.8rem',
    overflow: 'hidden',
    padding: 0,
  }}
>
  {user?.avatar
    ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.avatar}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    : user?.name?.[0]?.toUpperCase()
  }
</CollapsedBtn>
      </aside>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPANDED SIDEBAR — unchanged
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {open && (
        <div className="sidebar-overlay" onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 39, backdropFilter: 'blur(2px)' }}
        />
      )}
      <aside className="sidebar-persistent" style={{
        width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
        flexShrink: 0, height: '100vh',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>NexusAI</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {onToggleCollapse && (
              <button onClick={onToggleCollapse} title="Collapse sidebar" className="hide-mobile"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 5, borderRadius: 'var(--r-sm)', display: 'flex', transition: 'var(--ease)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none' }}
              ><PanelLeftClose size={14} /></button>
            )}
            <button onClick={onClose} className="hide-desktop"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 5, borderRadius: 'var(--r-sm)', display: 'flex' }}
            ><X size={14} /></button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button onClick={handleNew} className="sidebar-item" style={{ color: 'var(--text-secondary)' }}>
            <Plus size={14} /> New Chat
          </button>
          {NAV.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname.startsWith(path)
            return (
              <Link key={path} to={path} onClick={onClose} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                <Icon size={14} /> {label}
              </Link>
            )
          })}
        </nav>

        {/* Search */}
        <div style={{ padding: '8px 12px 4px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input className="input-field" placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ fontSize: '0.78rem', padding: '6px 8px 6px 28px' }} />
          </div>
        </div>

        {/* Conversations list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 8px', display: 'flex', flexDirection: 'column', gap: 1 }} className="no-scrollbar">
          {pinned.length > 0 && (
            <>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '6px 4px 3px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pinned</p>
              {pinned.map(c => (
                <ConvItem key={c._id} c={c} activeConvId={activeConvId}
                  onSelect={() => { onConvSelect?.(c._id); navigate(`/chat/${c._id}`); onClose?.() }}
                  menuId={menuId} onMenu={e => { e.stopPropagation(); setMenuId(menuId === c._id ? null : c._id) }}
                  onEdit={() => { setEditingId(c._id); setEditTitle(c.title) }}
                  editing={editingId === c._id} editTitle={editTitle} onEditChange={setEditTitle}
                  onEditSave={() => handleRename(c._id)} onEditCancel={() => setEditingId(null)}
                  onDelete={handleDelete} onPin={handlePin}
                />
              ))}
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            </>
          )}
          {recent.length > 0 && (
            <>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '6px 4px 3px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>Recents</p>
              {recent.map(c => (
                <ConvItem key={c._id} c={c} activeConvId={activeConvId}
                  onSelect={() => { onConvSelect?.(c._id); navigate(`/chat/${c._id}`); onClose?.() }}
                  menuId={menuId} onMenu={e => { e.stopPropagation(); setMenuId(menuId === c._id ? null : c._id) }}
                  onEdit={() => { setEditingId(c._id); setEditTitle(c.title) }}
                  editing={editingId === c._id} editTitle={editTitle} onEditChange={setEditTitle}
                  onEditSave={() => handleRename(c._id)} onEditCancel={() => setEditingId(null)}
                  onDelete={handleDelete} onPin={handlePin}
                />
              ))}
            </>
          )}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {search ? 'No conversations found' : 'No conversations yet'}
            </div>
          )}
        </div>

        {/* Usage meter */}
        <div style={{ margin: '0 12px 10px', padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg-card)', border: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Daily usage</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: pct > 80 ? 'var(--orange)' : 'var(--text-primary)' }}>{used}/{limit}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%`, background: pct > 80 ? 'var(--orange)' : 'var(--green)' }} />
          </div>
          {user?.plan === 'free' && pct > 70 && (
            <Link to="/upgrade" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 7, fontSize: '0.72rem', color: 'var(--orange)', fontWeight: 600 }}>
              <Crown size={10} /> Upgrade for 500 msg/day <ChevronRight size={10} />
            </Link>
          )}
        </div>

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>
          {profileOpen && (
            <div onClick={e => e.stopPropagation()} className="profile-popup animate-slide-up"
              style={{ position: 'absolute', bottom: '100%', left: 12, right: 12, marginBottom: 6, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)', zIndex: 100 }}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
              </div>
              <div style={{ padding: 6 }}>
                {[
                  { icon: Settings,   label: 'Settings', action: () => { navigate('/settings'); setProfileOpen(false) } },

                  { icon: HelpCircle, label: 'Help', action: () => { navigate('/help'); setProfileOpen(false) } },
                ].map(({ icon: Icon, label: lbl, action }) => (
                  <button key={lbl} onClick={action}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', transition: 'var(--ease)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  ><Icon size={14} /> {lbl}</button>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                {user?.plan === 'free' && (
                  <button onClick={() => { navigate('/upgrade'); setProfileOpen(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', fontSize: '0.82rem', color: 'var(--orange)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', transition: 'var(--ease)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-dim)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  ><Zap size={14} /> Upgrade plan</button>
                )}
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <button onClick={() => { logout(); setProfileOpen(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', fontSize: '0.82rem', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', transition: 'var(--ease)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--red-dim)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                ><LogOut size={14} /> Log out</button>
              </div>
            </div>
          )}
          <button onClick={e => { e.stopPropagation(); setProfileOpen(p => !p) }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', transition: 'var(--ease)', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
           <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--green-dim)', border: '1px solid rgba(0,208,132,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', fontWeight: 700, fontSize: '1.3rem', flexShrink: 0, overflow: 'hidden' }}>
  {user?.avatar
    ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.avatar}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    : user?.name?.[0]?.toUpperCase()
  }
</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              {user?.plan === 'pro'
                ? <span style={{ fontSize: '0.68rem', color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 3 }}> Pro</span>
                : <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Free plan</span>
              }
            </div>
          </button>
        </div>
      </aside>
    </>
  )
})

export default Sidebar

// ─────────────────────────────────────────────────────────────────────────────
function ConvItem({ c, activeConvId, onSelect, onMenu, menuId, onEdit, editing, editTitle, onEditChange, onEditSave, onEditCancel, onDelete, onPin }) {
  const isActive = activeConvId === c._id
  if (editing) {
    return (
      <div style={{ padding: '2px 2px' }} onClick={e => e.stopPropagation()}>
        <input className="input-field" value={editTitle} onChange={e => onEditChange(e.target.value)}
          style={{ padding: '5px 8px', fontSize: '0.78rem' }}
          onKeyDown={e => { if (e.key === 'Enter') onEditSave(); if (e.key === 'Escape') onEditCancel() }} autoFocus />
      </div>
    )
  }
  return (
    <div onClick={onSelect} className="group"
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'var(--ease)', fontSize: '0.78rem', background: isActive ? 'var(--green-dim)' : 'transparent', border: `1px solid ${isActive ? 'rgba(0,208,132,0.2)' : 'transparent'}`, color: isActive ? 'var(--green)' : 'var(--text-secondary)' }}
      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
    >
      {c.isPinned && <Pin size={9} color="var(--green)" style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
      <button onClick={onMenu} className="conv-menu-btn"
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 3px', borderRadius: 4, opacity: 0, flexShrink: 0, display: 'flex' }}
      ><MoreHorizontal size={12} /></button>
      {menuId === c._id && (
        <div onClick={e => e.stopPropagation()} className="animate-fade-in"
          style={{ position: 'absolute', right: 0, top: 28, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 4, minWidth: 144, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}
        >
          {[{ label: 'Rename', icon: Edit3, action: onEdit }, { label: c.isPinned ? 'Unpin' : 'Pin', icon: Pin, action: e => onPin(e, c._id) }].map(({ label, icon: Icon, action }) => (
            <button key={label} onClick={action}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-xs)', transition: 'var(--ease)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            ><Icon size={12} /> {label}</button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '3px 0' }} />
          <button onClick={e => onDelete(e, c._id)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: '0.78rem', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-xs)', transition: 'var(--ease)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--red-dim)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          ><Trash2 size={12} /> Delete</button>
        </div>
      )}
    </div>
  )
}
