import { Component } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        flexDirection: 'column',
        gap: 20,
        textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: 'var(--r-lg)',
          background: 'var(--red-dim)',
          border: '1px solid rgba(255,92,92,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={24} color="var(--red)" />
        </div>

        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 380 }}>
            An unexpected error occurred. Your data is safe — try refreshing the page.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              fontSize: '0.75rem',
              color: 'var(--red)',
              textAlign: 'left',
              maxWidth: 560,
              overflow: 'auto',
              fontFamily: 'var(--font-mono)',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>

        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          <RefreshCw size={14} /> Reload Page
        </button>
      </div>
    )
  }
}
