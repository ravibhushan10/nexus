import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'



const FLUSH_INTERVAL_MS = 30

export function useChat({ sidebarRef }) {
  const navigate            = useNavigate()
  const { user, updateUser } = useAuth()

  const [messages,     setMessages]     = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [streaming,    setStreaming]     = useState(false)
  const [loadingConv,  setLoadingConv]  = useState(false)
  const [features,     setFeatures]     = useState({ memory: true, systemPrompt: false })

  const systemPrompt    = user?.systemPrompt || ''
  const setSystemPrompt = () => {}

  const abortRef    = useRef(null)

  const bufferRef   = useRef('')

  const fullRef     = useRef('')
  const timerRef    = useRef(null)
  const doneDataRef = useRef(null)





  const startFlushing = useCallback((aiMsgId) => {
    if (timerRef.current) return
    timerRef.current = setInterval(() => {

      if (bufferRef.current.length > 0) {
        fullRef.current += bufferRef.current
        bufferRef.current = ''
        const snap = fullRef.current
        setMessages(prev =>
          prev.map(m => m._id === aiMsgId ? { ...m, content: snap } : m)
        )
      }


      if (doneDataRef.current && bufferRef.current.length === 0) {
        clearInterval(timerRef.current)
        timerRef.current = null
        const done = doneDataRef.current
        doneDataRef.current = null
        setMessages(prev =>
          prev.map(m =>
            m._id === aiMsgId
              ? { ...m, content: fullRef.current, tokens: done.tokens }
              : m
          )
        )
        updateUser({ usage: { messagesToday: done.messagesToday } })
      }
    }, FLUSH_INTERVAL_MS)
  }, [updateUser])

  const stopFlushing = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    bufferRef.current   = ''
    fullRef.current     = ''
    doneDataRef.current = null
  }, [])


  const loadConversation = useCallback(async (id) => {
    setLoadingConv(true)
    try {
      const { data } = await api.get(`/conversations/${id}`)
      setMessages(data.conversation.messages)
      setFeatures(prev => ({
        ...prev,
        memory: data.conversation.features?.memoryEnabled ?? true,
      }))
    } catch {
      toast.error('Failed to load conversation')
      navigate('/chat')
    } finally {
      setLoadingConv(false)
    }
  }, [navigate])

  const resetChat = useCallback(() => {
    setMessages([])
    setActiveConvId(null)
    setFeatures({ memory: true, systemPrompt: false })
  }, [])


  const sendMessage = useCallback(async (
    text,
    overrideConvId,
    { model, images = [], docs = [] } = {}


  ) => {
    if (!text?.trim() || loading) return

    const msg    = text.trim()
    const convId = overrideConvId ?? activeConvId

    setLoading(true)

    const userMsgId = `u-${Date.now()}`
    const aiMsgId   = `a-${Date.now()}`

    stopFlushing()
    bufferRef.current   = ''
    fullRef.current     = ''

    setMessages(prev => [
      ...prev,
      { role: 'user',      content: msg, type: 'text', _id: userMsgId, createdAt: new Date().toISOString() },
      { role: 'assistant', content: '',  type: 'text', _id: aiMsgId },
    ])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = localStorage.getItem('accessToken')

      const body = {
        message:        msg,
        conversationId: convId,
        memoryEnabled:  features.memory,
        systemPrompt:   features.systemPrompt ? systemPrompt : '',
        ...(model             ? { model }  : {}),
        ...(images.length > 0 ? { images } : {}),
        ...(docs.length   > 0 ? { docs }   : {}),
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
        signal:  controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Chat failed')
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   lineBuf = ''

      startFlushing(aiMsgId)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        lineBuf += decoder.decode(value, { stream: true })
        const lines = lineBuf.split('\n')
        lineBuf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            if (json.type === 'delta') {

              bufferRef.current += json.content
            } else if (json.type === 'done') {
              if (!convId && json.conversationId) {
                setActiveConvId(json.conversationId)
                navigate(`/chat/${json.conversationId}`, { replace: true })
                sidebarRef?.current?.refresh?.()
              }
              doneDataRef.current = json
            } else if (json.type === 'error') {
              throw new Error(json.message)
            }
          } catch (e) {
            if (e.name === 'AbortError') return
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }

      return { fullContent: fullRef.current, aiMsgId }

    } catch (err) {
      if (err.name === 'AbortError') return
      stopFlushing()
      toast.error(err.message || 'Something went wrong')
      setMessages(prev => prev.filter(m => m._id !== aiMsgId))
    } finally {
      setLoading(false)

      const waitForDrain = setInterval(() => {
        if (bufferRef.current.length === 0 && !doneDataRef.current) {
          clearInterval(waitForDrain)
          setStreaming(false)
          abortRef.current = null
        }
      }, 50)
    }
  }, [loading, activeConvId, features, systemPrompt, navigate, sidebarRef, startFlushing, stopFlushing])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    stopFlushing()
    setLoading(false)
    setStreaming(false)
  }, [stopFlushing])

  const editMessage = useCallback((messageId) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m._id === messageId)
      if (idx === -1) return prev
      return prev.slice(0, idx)
    })
  }, [])

  const toggleFeature = useCallback((key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return {
    messages, setMessages,
    activeConvId, setActiveConvId,
    loading, streaming,
    loadingConv,
    features, toggleFeature,
    systemPrompt, setSystemPrompt,
    loadConversation,
    resetChat,
    sendMessage,
    stopStreaming,
    editMessage,
  }
}
