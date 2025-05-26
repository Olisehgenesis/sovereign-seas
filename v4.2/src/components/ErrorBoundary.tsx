import  { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleClose = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <>
          {this.props.children}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
              <button
                onClick={this.handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 mb-4">
                <p className="text-red-700 font-medium mb-2">Error Details:</p>
                <p className="text-red-600 text-sm font-mono">
                  {this.state.error?.message || 'An unknown error occurred'}
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={this.handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary 