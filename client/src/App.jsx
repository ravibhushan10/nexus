import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SidebarProvider } from './context/SidebarContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { PageLoader } from './components/ui/Spinner'
import AuthModals from './components/AuthModals'
import Chat      from './pages/Chat'
import Upgrade   from './pages/Upgrade'
import Analytics from './pages/Analytics'
import Settings  from './pages/Settings'
import Help      from './pages/Help'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const [showLogin,    setShowLogin]    = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  if (loading) return <PageLoader text="Loading NexusAI..." />

  if (!user) {
    return (
      <>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: 'var(--bg-primary)',
          flexDirection: 'column', gap: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 52, height: 52,
              background: 'linear-gradient(135deg, var(--purple), #6b3fd4)',
              borderRadius: 14, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 26,
            }}>N</div>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>NexusAI</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: 8, textAlign: 'center', maxWidth: 300 }}>
            Your AI-powered assistant, always ready to help
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setShowLogin(true)} style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, var(--purple), #6b3fd4)',
              color: '#fff', border: 'none', borderRadius: 'var(--r-md)',
              fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}>Sign In</button>
            <button onClick={() => setShowRegister(true)} style={{
              padding: '12px 32px',
              background: 'transparent', color: 'var(--text-primary)',
              border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
              fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}>Create Account</button>
          </div>
        </div>
        <AuthModals
          showLogin={showLogin}       onCloseLogin={() => setShowLogin(false)}
          showRegister={showRegister} onCloseRegister={() => setShowRegister(false)}
          onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true) }}
          onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true) }}
        />
      </>
    )
  }

  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SidebarProvider>
          <Routes>
            <Route path="/"          element={<Navigate to="/chat" replace />} />
            <Route path="/chat"      element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/chat/:id"  element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/upgrade"   element={<PrivateRoute><Upgrade /></PrivateRoute>} />
            <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
            <Route path="/settings"  element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/help"      element={<PrivateRoute><Help /></PrivateRoute>} />
            <Route path="*"          element={<Navigate to="/chat" replace />} />
          </Routes>
        </SidebarProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
