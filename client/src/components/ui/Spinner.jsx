export function Spinner({ size = 18, color = 'var(--green)' }) {
  return (
    <div
      className="spinner"
      style={{ width: size, height: size, borderTopColor: color }}
    />
  )
}

export function PageLoader({ text = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-primary)',
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <div className="spinner" style={{ width: 44, height: 44, borderWidth: 3 }} />
        <div className="spinner" style={{
          width: 26, height: 26,
          position: 'absolute', top: 9, left: 9,
          borderWidth: 2,
          borderTopColor: 'transparent',
          borderBottomColor: 'var(--purple)',
          animationDirection: 'reverse',
          animationDuration: '0.5s',
        }} />
      </div>
      <p style={{
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
      }}>{text}</p>
    </div>
  )
}
