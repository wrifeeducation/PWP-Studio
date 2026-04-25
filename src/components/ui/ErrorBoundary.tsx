/**
 * WF-046 — Error Boundary
 * React class component that catches render errors in any child.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, would send to monitoring service
    console.error('[ErrorBoundary] Caught error:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center"
          role="alert"
          data-testid="error-boundary-fallback"
        >
          <div
            className="rounded-2xl p-8 max-w-sm w-full"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="text-4xl mb-4" aria-hidden="true">⚠️</div>
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text)' }}
              data-tts="Something went wrong"
            >
              Something went wrong.
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Your work has been saved. Please reload the page to continue.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              data-testid="reload-page-button"
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
