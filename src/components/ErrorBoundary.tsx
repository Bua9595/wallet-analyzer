import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, maxWidth: 640, margin: '48px auto', fontFamily: 'ui-sans-serif, system-ui' }}>
          <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>Unerwarteter Fehler</h1>
          <p style={{ marginTop: 0, color: '#334155' }}>
            Die Anwendung ist auf ein Problem gestoßen. Bitte lade die Seite neu.
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f1f5f9', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            {String(this.state.error)}
          </pre>
          <button onClick={() => location.reload()} style={{ marginTop: 12, padding: '8px 12px', background: '#0ea5e9', color: 'white', borderRadius: 8, border: 0 }}>
            Neu laden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
