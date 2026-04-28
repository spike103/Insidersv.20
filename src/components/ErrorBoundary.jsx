import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Insiders crash:', error, info)
    this.setState({ info })
  }

  reset = () => {
    this.setState({ hasError: false, error: null, info: null })
  }

  clearAll = () => {
    try {
      localStorage.removeItem('insiders-state')
    } catch {}
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error) || 'Erreur inconnue'
      const stack = this.state.error?.stack || ''
      return (
        <div style={{
          minHeight: '100vh', padding: 24,
          background: 'var(--ink-900)', color: 'var(--fg-1)',
          fontFamily: 'Poppins, sans-serif',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💥</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Oups, une erreur est survenue</div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 16 }}>
            L'application a rencontré un problème. Essaie de recharger — si ça persiste, tu peux réinitialiser tes données locales.
          </div>

          <div style={{
            background: 'var(--ink-800)', border: '1px solid var(--ink-600)',
            borderRadius: 12, padding: 14, marginBottom: 16,
            fontSize: 12, fontFamily: 'monospace', overflow: 'auto',
            maxHeight: 200,
          }}>
            <div style={{ color: 'var(--loss-400)', fontWeight: 700, marginBottom: 6 }}>{msg}</div>
            <pre style={{ color: 'var(--fg-3)', fontSize: 10, whiteSpace: 'pre-wrap', margin: 0 }}>
              {stack.split('\n').slice(0, 8).join('\n')}
            </pre>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                flex: 1, padding: '12px',
                background: 'var(--blue-500)', color: 'white',
                border: 'none', borderRadius: 12,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Recharger la page
            </button>
            <button
              onClick={this.clearAll}
              style={{
                flex: 1, padding: '12px',
                background: 'transparent', color: 'var(--loss-400)',
                border: '1px solid var(--loss-400)', borderRadius: 12,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Tout réinitialiser
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
