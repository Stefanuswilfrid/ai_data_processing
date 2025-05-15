"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/20 text-red-400 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m8 2 1.88 1.88"></path>
              <path d="M14.12 3.88 16 2"></path>
              <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"></path>
              <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"></path>
              <path d="M12 20v-9"></path>
              <path d="M6.53 9C4.6 8.8 3 7.1 3 5"></path>
              <path d="M6 13H2"></path>
              <path d="M3 21c0-2.1 1.7-3.9 3.8-4"></path>
              <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"></path>
              <path d="M22 13h-4"></path>
              <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-slate-300 mb-6 max-w-md mx-auto">
            We encountered an error while processing your request. Please try again or contact support if the problem
            persists.
          </p>
          <div className="space-x-4">
            <Button onClick={this.handleReset} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Try Again
            </Button>
            <Button
              variant="outline"
              className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
          {this.state.error && (
            <div className="mt-6 p-4 bg-slate-900/50 rounded-lg text-left overflow-auto max-h-[200px] text-xs text-slate-400">
              <pre>{this.state.error.toString()}</pre>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
