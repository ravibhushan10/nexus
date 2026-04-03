import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Send, Square, Menu, Download, X, Share2, FileText, Image,
  ChevronDown, Check, Lock, Link as LinkIcon, Paperclip,
} from 'lucide-react'
import Sidebar from '../components/layout/Sidebar'
import MessageBubble from '../components/chat/MessageBubble'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../hooks/useChat'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useSidebar } from '../context/SidebarContext'

const MODELS = [
  { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B',  sub: 'Fast',     pro: false },
  { id: 'qwen/qwen3-32b',          label: 'Qwen3 32B',      sub: 'Balanced', pro: false },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B',  sub: 'Powerful', pro: true  },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── PDF text extraction using pdf.js (loaded from CDN, no install needed) ────
// Returns plain text string from a base64-encoded PDF.
async function extractPdfText(base64Data) {
  // Lazy-load pdf.js from CDN the first time it's needed
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }

  const binary    = atob(base64Data)
  const bytes     = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const pdf   = await window.pdfjsLib.getDocument({ data: bytes }).promise
  const parts = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p)
    const content = await page.getTextContent()
    parts.push(content.items.map(i => i.str).join(' '))
  }
  return parts.join('\n\n')
}

export default function Chat() {
  const { id: convId } = useParams()
  const navigate       = useNavigate()
  const { user }       = useAuth()

  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed,
          open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()

  const [input,         setInput]         = useState('')
  const [suggestions,   setSuggestions]   = useState([])
  const [editingMsgId,  setEditingMsgId]  = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  // Model
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [showModelMenu, setShowModelMenu] = useState(false)

  // Attachments
  // Images: { name, mimeType, data (base64), preview (dataURL) }
  const [attachedImages, setAttachedImages] = useState([])
  // Docs:   { name, mimeType, text (extracted plain text) }
  const [attachedDocs,   setAttachedDocs]   = useState([])
  const [extractingDoc,  setExtractingDoc]  = useState(false)  // shows spinner on doc attach
  const [showAttachMenu, setShowAttachMenu] = useState(false)

  // Share
  const [showShareMenu, setShowShareMenu] = useState(false)

  const bottomRef     = useRef(null)
  const inputRef      = useRef(null)
  const sidebarRef    = useRef(null)
  const modelMenuRef  = useRef(null)
  const attachMenuRef = useRef(null)
  const shareMenuRef  = useRef(null)
  const imgFileRef    = useRef(null)
  const docFileRef    = useRef(null)
  const scrollRef     = useRef(null)
  // true = user has manually scrolled up; we stop auto-scrolling in that case
  const userScrolledRef = useRef(false)

  const {
    messages, setMessages,
    activeConvId, setActiveConvId,
    loading, streaming,
    loadingConv,
    features, toggleFeature,
    systemPrompt,
    loadConversation, resetChat,
    sendMessage, stopStreaming, editMessage,
  } = useChat({ sidebarRef })

  const systemPromptActive = (user?.systemPrompt || '').trim().length > 0

  useEffect(() => {
    if (convId) { loadConversation(convId); setActiveConvId(convId) }
    else        { resetChat() }
  }, [convId])

  // ── Scroll management ──────────────────────────────────────────────────────
  // Rule: auto-scroll ONLY when the user hasn't manually scrolled up.
  // We never force-reset userScrolledRef during streaming — that's what was
  // yanking the user back down mid-read in the original code.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    // Consider "scrolled up" if more than 80px from bottom
    userScrolledRef.current = dist > 80
    setShowScrollBtn(dist > 80)
  }, [])

  // Auto-scroll on new messages — only if user is at bottom
  useEffect(() => {
    if (userScrolledRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── REMOVED: the old streaming useEffect that reset userScrolledRef ────────
  // That block was: `if (!streaming) return; userScrolledRef.current = false; ...`
  // It caused the page to jump back to bottom whenever streaming started,
  // even if the user had scrolled up to re-read earlier messages.

  const scrollToBottom = useCallback(() => {
    userScrolledRef.current = false
    setShowScrollBtn(false)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { inputRef.current?.focus() }, [])

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (modelMenuRef.current  && !modelMenuRef.current.contains(e.target))  setShowModelMenu(false)
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) setShowAttachMenu(false)
      if (shareMenuRef.current  && !shareMenuRef.current.contains(e.target))  setShowShareMenu(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  // ── System prompt toggle ───────────────────────────────────────────────────
  const handleSystemPromptClick = () => {
    if (systemPromptActive) {
      toggleFeature('systemPrompt')
      toast.success(!features.systemPrompt ? 'System prompt enabled!' : 'System prompt disabled')
    } else {
      toast('Set a system prompt in Settings first', { icon: '⚙️' })
      setTimeout(() => navigate('/settings', { state: { tab: 'systemprompt' } }), 600)
    }
  }

  // ── Image attach ───────────────────────────────────────────────────────────
  const handleImageAttach = (e) => {
    const files = Array.from(e.target.files || [])
    setShowAttachMenu(false)
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        setAttachedImages(prev => [...prev, {
          name:     file.name,
          mimeType: file.type,
          data:     reader.result.split(',')[1],   // base64 only
          preview:  reader.result,                  // full dataURL for <img>
        }])
      }
      reader.readAsDataURL(file)
    })
    toast.success(`${files.length} image${files.length > 1 ? 's' : ''} attached`)
    e.target.value = ''
  }

  // ── Document attach — extract text immediately ─────────────────────────────
  // For .txt / .md  → decode base64 directly (instant)
  // For .pdf        → use pdf.js to extract page text (async, shows spinner)
  // For .doc/.docx  → tell user we can only extract .pdf/.txt for now
  const handleDocAttach = async (e) => {
    const files = Array.from(e.target.files || [])
    setShowAttachMenu(false)
    e.target.value = ''

    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase()

      if (['doc', 'docx'].includes(ext)) {
        toast.error(`${file.name}: Word docs not supported yet. Save as PDF or TXT.`)
        continue
      }

      setExtractingDoc(true)
      try {
        const base64 = await new Promise((res, rej) => {
          const reader = new FileReader()
          reader.onload  = () => res(reader.result.split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(file)
        })

        let text = ''

        if (ext === 'pdf') {
          text = await extractPdfText(base64)
          if (!text.trim()) {
            toast.error(`${file.name}: Could not extract text (scanned PDF?).`)
            continue
          }
        } else {
          // .txt, .md — just decode the base64
          text = atob(base64)
        }

        setAttachedDocs(prev => [...prev, { name: file.name, mimeType: file.type, text }])
        toast.success(`${file.name} ready`)
      } catch (err) {
        console.error('Doc extract error:', err)
        toast.error(`Failed to read ${file.name}`)
      } finally {
        setExtractingDoc(false)
      }
    }
  }

  const removeImage = (name) => setAttachedImages(prev => prev.filter(f => f.name !== name))
  const removeDoc   = (name) => setAttachedDocs(prev => prev.filter(f => f.name !== name))

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text = input) => {
    if ((!text.trim() && attachedImages.length === 0 && attachedDocs.length === 0) || loading) return

    const msgText = text.trim()
      || (attachedImages.length > 0 ? 'What is in this image?' : '')
      || (attachedDocs.length   > 0 ? 'Summarise this document.' : '')

    setInput('')
    setSuggestions([])
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setEditingMsgId(null)

    const imgs = [...attachedImages]
    const docs = [...attachedDocs]
    setAttachedImages([])
    setAttachedDocs([])

    // When streaming starts, scroll to bottom only if user is already at bottom
    if (!userScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const result = await sendMessage(msgText, undefined, {
      model:  selectedModel,
      images: imgs,
      docs,           // ← extracted text docs forwarded to useChat → backend
    })

    if (!result) return
    try {
      const { data } = await api.post('/chat/suggestions', {
        lastMessage: result.fullContent, conversationContext: msgText,
      })
      if (data.suggestions?.length) setSuggestions(data.suggestions)
    } catch {}
    inputRef.current?.focus()
  }, [input, attachedImages, attachedDocs, loading, sendMessage, selectedModel])

  const handleEdit = useCallback((msgId, content) => {
    editMessage(msgId, content)
    setSuggestions([])
    setInput(content)
    setEditingMsgId(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [editMessage])

  const handleRetry = useCallback(() => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    setMessages(prev => prev.slice(0, prev.findLastIndex(m => m.role === 'user')))
    setSuggestions([])
    sendMessage(lastUser.content)
  }, [messages, sendMessage, setMessages])

  // ── Export / Share ─────────────────────────────────────────────────────────
  const exportConversation = () => {
    if (!messages.length) return toast.error('No messages to export')
    const md = messages.map(m => `**${m.role === 'user' ? 'You' : 'NexusAI'}:**\n\n${m.content}`).join('\n\n---\n\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `nexusai-${activeConvId || 'chat'}.md`; a.click()
    URL.revokeObjectURL(url); toast.success('Downloaded!'); setShowShareMenu(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success('Link copied!')).catch(() => toast.error('Could not copy'))
    setShowShareMenu(false)
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  const limit   = user?.plan === 'pro' ? 500 : 20
  const used    = user?.usage?.messagesToday || 0
  const atLimit = used >= limit
  const isEmpty = messages.length === 0
  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0]

  // ── Input box ──────────────────────────────────────────────────────────────
  const InputBox = (
    <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>

      {/* Attachment previews */}
      {(attachedImages.length > 0 || attachedDocs.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {attachedImages.map(f => (
            <div key={f.name} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
              <img src={f.preview} alt={f.name} style={{ width: 72, height: 72, objectFit: 'cover', display: 'block' }} />
              <button onClick={() => removeImage(f.name)} style={{
                position: 'absolute', top: 3, right: 3, width: 18, height: 18,
                borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: 'none',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><X size={10} /></button>
            </div>
          ))}
          {attachedDocs.map(f => (
            <div key={f.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-secondary)', maxWidth: 200,
            }}>
              <FileText size={14} color="var(--purple)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button onClick={() => removeDoc(f.name)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                <X size={10} />
              </button>
            </div>
          ))}
          {/* Spinner while extracting doc text */}
          {extractingDoc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <Spinner size={14} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reading…</span>
            </div>
          )}
        </div>
      )}

      {/* Main input card */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '12px 14px 10px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}
        onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(157,111,255,0.06)' }}
        onBlurCapture={e  => { e.currentTarget.style.borderColor = 'var(--border)';       e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)' }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={atLimit ? 'Daily limit reached…' : 'Ask anything…'}
          disabled={atLimit || extractingDoc}
          rows={1}
          style={{
            width: '100%', background: 'transparent', color: 'var(--text-primary)',
            fontSize: '0.93rem', border: 'none', outline: 'none', resize: 'none',
            lineHeight: 1.6, minHeight: 28, maxHeight: 200, overflowY: 'auto',
            fontFamily: 'var(--font-sans)', display: 'block', marginBottom: 10, padding: 0,
          }}
        />

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* Attach */}
          <div style={{ position: 'relative' }} ref={attachMenuRef}>
            <button onClick={() => setShowAttachMenu(p => !p)} title="Attach"
              style={{ width: 34, height: 34, borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';       e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Paperclip size={15} />
            </button>

            {showAttachMenu && (
              <div className="animate-fade-in" style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 300,
                background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                borderRadius: 12, padding: 6, minWidth: 220,
                boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
              }}>
                {/* Image option */}
                <button onClick={() => imgFileRef.current?.click()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.12s', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none';           e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(77,166,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Image size={14} color="var(--blue)" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem' }}>Photo or image</p>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)' }}>JPG, PNG, WEBP — AI will describe it</p>
                  </div>
                </button>

                {/* Document option */}
                <button onClick={() => docFileRef.current?.click()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.12s', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none';           e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(157,111,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={14} color="var(--purple)" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem' }}>Document</p>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)' }}>PDF, TXT, MD — text extracted automatically</p>
                  </div>
                </button>
              </div>
            )}

            <input ref={imgFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple style={{ display: 'none' }} onChange={handleImageAttach} />
            <input ref={docFileRef} type="file" accept=".pdf,.txt,.md" multiple style={{ display: 'none' }} onChange={handleDocAttach} />
          </div>

          {/* Model selector */}
          <div style={{ position: 'relative' }} ref={modelMenuRef}>
            <button onClick={() => setShowModelMenu(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';       e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {/* Show vision label when images attached */}
              {attachedImages.length > 0 ? '🔍 Vision (auto)' : currentModel.label} <ChevronDown size={11} />
            </button>

            {showModelMenu && (
              <div className="animate-fade-in" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 300, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 8, minWidth: 240, boxShadow: '0 -12px 40px rgba(0,0,0,0.6)' }}>
                <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.08em', padding: '2px 8px 8px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Model</p>
                {attachedImages.length > 0 && (
                  <div style={{ padding: '6px 10px 8px', fontSize: '0.72rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                    🔍 Vision model auto-selected for images
                  </div>
                )}
                {MODELS.map(m => {
                  const locked = m.pro && user?.plan !== 'pro'
                  const active = selectedModel === m.id
                  return (
                    <button key={m.id}
                      onClick={() => { if (!locked) { setSelectedModel(m.id); setShowModelMenu(false) } }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, background: active ? 'rgba(157,111,255,0.08)' : 'none', border: `1px solid ${active ? 'rgba(157,111,255,0.2)' : 'transparent'}`, cursor: locked ? 'default' : 'pointer', transition: 'all 0.12s' }}
                      onMouseEnter={e => { if (!active && !locked) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(157,111,255,0.08)' : 'none' }}
                    >
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: active ? 'var(--purple)' : 'var(--text-primary)', margin: 0 }}>{m.label}</p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', margin: 0 }}>{m.sub}</p>
                      </div>
                      {locked ? (
                        <span onClick={e => { e.stopPropagation(); window.location.href = '/upgrade' }}
                          style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(157,111,255,0.12)', border: '1px solid rgba(157,111,255,0.3)', color: 'var(--purple)', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                          Upgrade
                        </span>
                      ) : active ? (
                        <Check size={13} color="var(--purple)" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* System prompt pill */}
          <button onClick={handleSystemPromptClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1px solid ${systemPromptActive && features.systemPrompt ? 'rgba(157,111,255,0.4)' : 'var(--border)'}`, background: systemPromptActive && features.systemPrompt ? 'rgba(157,111,255,0.08)' : 'transparent', color: systemPromptActive && features.systemPrompt ? 'var(--purple)' : 'var(--text-muted)', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            System Prompt
            <span style={{ padding: '1px 6px', borderRadius: 4, background: systemPromptActive && features.systemPrompt ? 'var(--purple)' : 'var(--border)', color: systemPromptActive && features.systemPrompt ? '#fff' : 'var(--text-muted)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.06em' }}>
              {systemPromptActive && features.systemPrompt ? 'ON' : 'OFF'}
            </span>
          </button>

          <div style={{ flex: 1 }} />

          {/* Stop / Send */}
          {streaming ? (
            <button onClick={stopStreaming} title="Stop" style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,92,92,0.1)', border: '1px solid rgba(255,92,92,0.3)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Square size={13} />
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && attachedImages.length === 0 && attachedDocs.length === 0) || loading || atLimit || extractingDoc}
              title="Send (Enter)"
              style={{ width: 34, height: 34, borderRadius: 10, background: (!input.trim() && attachedImages.length === 0 && attachedDocs.length === 0) || loading || atLimit || extractingDoc ? 'var(--bg-hover)' : 'var(--purple)', color: (!input.trim() && attachedImages.length === 0 && attachedDocs.length === 0) || loading || atLimit || extractingDoc ? 'var(--text-muted)' : '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              <Send size={14} />
            </button>
          )}
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
        NexusAI can make mistakes. Verify important information.
      </p>
    </div>
  )

  return (
    <div className="app-shell">
      <Sidebar
        ref={sidebarRef}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeConvId={activeConvId}
        onConvSelect={setActiveConvId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      <div className="main-content">
        {/* Top bar */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(12px)', flexShrink: 0, zIndex: 10, borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)} className="hide-desktop" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 8 }}>
            <Menu size={18} />
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,var(--purple),#6b3fd4)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>N</div>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>NexusAI</span>
            </div>
          </div>

          {messages.length > 0 && (
            <div style={{ position: 'relative' }} ref={shareMenuRef}>
              <button onClick={() => setShowShareMenu(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                <Share2 size={13} /> Share
              </button>
              {showShareMenu && (
                <div className="animate-fade-in" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 6, minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  {[
                    { icon: LinkIcon, label: 'Copy link',    action: copyLink },
                    { icon: Download, label: 'Download .md', action: exportConversation },
                  ].map(({ icon: Icon, label: lbl, action }) => (
                    <button key={lbl} onClick={action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                      <Icon size={13} /> {lbl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        {loadingConv ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size={32} />
          </div>
        ) : isEmpty ? (
          <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', gap: 28 }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1.2, margin: 0 }}>
                {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8 }}>How can I help you today?</p>
            </div>
            <div style={{ width: '100%', maxWidth: 720, padding: '0 8px' }}>{InputBox}</div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 8px' }}>
              <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={msg._id || i} message={msg}
                    isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
                    onRetry={msg.role === 'assistant' && !streaming ? handleRetry : undefined}
                    onEdit={msg.role === 'user' && !streaming ? () => handleEdit(msg._id, msg.content) : undefined}
                  />
                ))}

                {suggestions.length > 0 && !streaming && !loading && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {suggestions.slice(0, 3).map((s, i) => (
                      <button key={i} className="suggestion-chip" onClick={() => { handleSend(s); setSuggestions([]) }}>{s}</button>
                    ))}
                    <button onClick={() => setSuggestions([])} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px 4px' }}>
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {atLimit && (
              <div style={{ margin: '0 16px 8px', padding: '9px 16px', borderRadius: 10, background: 'var(--red-dim)', border: '1px solid rgba(255,92,92,0.2)', color: 'var(--red)', fontSize: '0.82rem', textAlign: 'center' }}>
                Daily limit reached.{' '}
                <a href="/upgrade" style={{ fontWeight: 700, textDecoration: 'underline' }}>Upgrade to Pro</a> for 500 messages/day.
              </div>
            )}

            <div style={{ padding: '8px 16px 14px', background: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
              {InputBox}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
