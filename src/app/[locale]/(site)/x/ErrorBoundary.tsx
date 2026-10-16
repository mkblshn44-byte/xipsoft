'use client'

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', { error, errorInfo })
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h3 className="text-red-800 dark:text-red-200 font-medium">
              Something went wrong
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
