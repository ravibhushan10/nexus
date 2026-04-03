import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, BookOpen, RefreshCw, ThumbsUp, ThumbsDown, Edit2 } from 'lucide-react'

const LANG_META = {
  python:     { label: 'Python',     color: '#3b82f6' },
  javascript: { label: 'JavaScript', color: '#f59e0b' },
  js:         { label: 'JavaScript', color: '#f59e0b' },
  typescript: { label: 'TypeScript', color: '#3b82f6' },
  ts:         { label: 'TypeScript', color: '#3b82f6' },
  jsx:        { label: 'JSX',        color: '#60a5fa' },
  tsx:        { label: 'TSX',        color: '#60a5fa' },
  bash:       { label: 'Bash',       color: '#00d084' },
  sh:         { label: 'Shell',      color: '#00d084' },
  json:       { label: 'JSON',       color: '#ff9f43' },
  css:        { label: 'CSS',        color: '#9d6fff' },
  html:       { label: 'HTML',       color: '#f97316' },
  sql:        { label: 'SQL',        color: '#00c9a7' },
  rust:       { label: 'Rust',       color: '#f97316' },
  go:         { label: 'Go',         color: '#4da6ff' },
  java:       { label: 'Java',       color: '#f59e0b' },
  cpp:        { label: 'C++',        color: '#60a5fa' },
  c:          { label: 'C',          color: '#60a5fa' },
  yaml:       { label: 'YAML',       color: '#ff9f43' },
  markdown:   { label: 'Markdown',   color: '#8080a8' },
  md:         { label: 'Markdown',   color: '#8080a8' },
}

function fmtShortDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function fmtFullDateTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/* ── Shared tooltip box — same dark box style as the timestamp popup ── */
function Tooltip({ label, show }) {
  if (!label) return null
  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 6px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1a1a1a',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '4px 10px',
      fontSize: '0.7rem',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      zIndex: 50,
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

/* ── Date badge with tooltip showing full datetime ─────────────────── */
function DateBadge({ ts }) {
  const [show, setShow] = useState(false)
  if (!ts) return null
  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        cursor: 'default',
        padding: '2px 4px',
        userSelect: 'none',
      }}>
        {fmtShortDate(ts)}
      </span>
      <Tooltip label={fmtFullDateTime(ts)} show={show} />
    </div>
  )
}

/* ── Universal icon button — icon only by default, tooltip below on hover ──
   active:      keeps the icon coloured even after hover ends
   activeColor: colour used when active (green for like/copy, red for dislike)
──────────────────────────────────────────────────────────────────────────── */
function IconBtn({ onClick, tooltip, children, active, activeColor = 'var(--green)' }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 6,
        border: 'none',
        background: hov ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: active ? activeColor : hov ? 'var(--text-primary)' : 'var(--text-muted)',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        transition: 'background 0s, color 0s',
      }}
    >
      {children}
      <Tooltip label={tooltip} show={hov} />
    </button>
  )
}

/* ── Code-block copy button (inline, with text label) ──────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      style={{
        background: 'none',
        border: 'none',
        color: copied ? 'var(--green)' : 'var(--text-muted)',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '0.7rem',
        fontFamily: 'var(--font-mono)',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      {copied ? <Check size={11} color="var(--green)" /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Main MessageBubble
══════════════════════════════════════════════════════════════════════ */
export default function MessageBubble({ message, isStreaming, onRetry, onEdit }) {
  const isUser = message.role === 'user'

  const [copied,   setCopied]   = useState(false)
  const [feedback, setFeedback] = useState(null)   // null | 'up' | 'down'
  const [hovering, setHovering] = useState(false)

  const ts = message.createdAt || message.timestamp

  const copyAll = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Toggle: click same button again to deactivate
  const handleFeedback = (type) =>
    setFeedback(prev => prev === type ? null : type)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        padding: '0 2px',
        animation: 'pageIn 0.18s ease',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >

      {/* ═══ BUBBLE ════════════════════════════════════════════════ */}
      {message.content && (
        isUser ? (
          /* User: pill bubble, right side */
          <div style={{
            maxWidth: '75%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 16px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            lineHeight: 1.65,
          }}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
          </div>
        ) : (
          /* AI: plain prose, left side */
          <div
            style={{ width: '100%' }}
            className={`prose-chat${isStreaming ? ' typing-cursor' : ''}`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }) {
                  const match   = /language-(\w+)/.exec(className || '')
                  const lang    = match?.[1]?.toLowerCase() || ''
                  const isBlock = String(children).includes('\n')
                  if (isBlock) {
                    const meta  = LANG_META[lang]
                    const label = meta?.label || lang || 'code'
                    const color = meta?.color || 'var(--text-muted)'
                    const code  = String(children).replace(/\n$/, '')
                    return (
                      <div >
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '2px 2px',



                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 5 }}>
                              {['#ff5f57', '#ffbd2e', '#28c941'].map((c, i) => (
                                <div key={i} style={{
                                  width: 8, height: 8,
                                  borderRadius: '50%',
                                  background: c, opacity: 0.85,
                                }} />
                              ))}
                            </div>
                            <span style={{
                              fontSize: '0.7rem', color,
                              fontFamily: 'var(--font-mono)', fontWeight: 600,
                            }}>
                              {label}
                            </span>
                          </div>
                          <CopyBtn text={code} />
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={lang || 'text'}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius:6,
                            fontSize: '1.1rem', lineHeight: 1,
                          }}
                          {...props}
                        >
                          {code}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }
                  return (
                    <code style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.82em',
                      background: 'rgba(0,208,132,0.08)',
                      border: '1px solid rgba(0,208,132,0.18)',
                      borderRadius: 4, padding: '1px 5px',
                      color: 'var(--green)',
                    }} {...props}>
                      {children}
                    </code>
                  )
                },
                table({ children }) {
                  return (
                    <div style={{ overflowX: 'auto', margin: '10px 0' }}>
                      <table style={{ minWidth: '100%' }}>{children}</table>
                    </div>
                  )
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )
      )}

      {/* ═══ RAG SOURCES ═══════════════════════════════════════════ */}
      {message.sources?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {message.sources.map((s, i) => (
            <div key={i} className="badge badge-green" style={{ gap: 5 }}>
              <BookOpen size={9} /> {s.documentName}
            </div>
          ))}
        </div>
      )}
      {!isStreaming && message.content && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          marginTop: 5,
          flexDirection: isUser ? 'row-reverse' : 'row',
          opacity: isUser ? (hovering ? 1 : 0) : 1,
          pointerEvents: isUser ? (hovering ? 'auto' : 'none') : 'auto',
          transition: 'none',
          minHeight: 30,
        }}>

          {/* ── USER toolbar ── */}
          {isUser && (
            <>
              <DateBadge ts={ts} />

              <div style={{
                width: 1, height: 12,
                background: 'var(--border)',
                margin: '0 3px', opacity: 0.5,
              }} />

              {onRetry && (
                <IconBtn onClick={onRetry} tooltip="Retry">
                  <RefreshCw size={13} />
                </IconBtn>
              )}

              {onEdit && (
                <IconBtn onClick={onEdit} tooltip="Edit">
                  <Edit2 size={13} />
                </IconBtn>
              )}

              <IconBtn
                onClick={copyAll}
                tooltip={copied ? 'Copied!' : 'Copy'}
                active={copied}
                activeColor="var(--green)"
              >
                {copied
                  ? <Check size={13} color="var(--green)" />
                  : <Copy size={13} />
                }
              </IconBtn>
            </>
          )}

          {/* ── AI toolbar ── */}
          {!isUser && (
            <>
              <IconBtn
                onClick={copyAll}
                tooltip={copied ? 'Copied!' : 'Copy'}
                active={copied}
                activeColor="var(--green)"
              >
                {copied
                  ? <Check size={13} color="var(--green)" />
                  : <Copy size={13} />
                }
              </IconBtn>

              <IconBtn
                onClick={() => handleFeedback('up')}
                tooltip="Like"
                active={feedback === 'up'}
                activeColor="var(--green)"
              >
                <ThumbsUp size={13} />
              </IconBtn>

              <IconBtn
                onClick={() => handleFeedback('down')}
                tooltip="Dislike"
                active={feedback === 'down'}
                activeColor="#ef4444"
              >
                <ThumbsDown size={13} />
              </IconBtn>

              {onRetry && (
                <IconBtn onClick={onRetry} tooltip="Retry">
                  <RefreshCw size={13} />
                </IconBtn>
              )}
            </>
          )}

        </div>
      )}
    </div>
  )
}
