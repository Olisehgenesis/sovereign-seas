import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, X, Code, Copy, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleClose = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false })
  }

  private toggleDetails = () => {
    this.setState({ showDetails: !this.state.showDetails })
  }

  private copyErrorToClipboard = () => {
    const errorText = `
Error: ${this.state.error?.message || 'Unknown error'}
Stack: ${this.state.error?.stack || 'No stack trace'}
Component Stack: ${this.state.errorInfo?.componentStack || 'No component stack'}
    `.trim()
    
    navigator.clipboard.writeText(errorText).then(() => {
      console.log('Error details copied to clipboard')
    })
  }

  public render() {
    if (this.state.hasError) {
      const isHookError = this.state.error?.message?.includes('hook') || 
                         this.state.error?.message?.includes('render') ||
                         this.state.error?.stack?.includes('hook')

      return (
        <>
          {this.props.children}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative mt-4 sm:mt-8 lg:mt-16 mb-4">
              <div className="sticky top-0 bg-white border-b p-6 rounded-t-xl">
                <button
                  onClick={this.handleClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    {isHookError ? 'React Hook Error Detected' : 'Something went wrong'}
                  </h2>
                </div>

                {isHookError && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-yellow-800 text-sm">
                      🔍 This appears to be a React Hook error. Check the component stack below to find where hooks are being called conditionally.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 pt-0">
                {/* Error Message */}
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <p className="text-red-700 font-medium mb-2">Error Message:</p>
                  <p className="text-red-600 text-sm font-mono break-words">
                    {this.state.error?.message || 'An unknown error occurred'}
                  </p>
                </div>

                {/* Component Stack */}
                {this.state.errorInfo?.componentStack && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <p className="text-blue-700 font-medium mb-2">Component Stack:</p>
                    <pre className="text-blue-600 text-xs font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}

                {/* Toggle Details */}
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 text-sm"
                >
                  <Code className="h-4 w-4" />
                  {this.state.showDetails ? 'Hide' : 'Show'} Technical Details
                  {this.state.showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {/* Detailed Stack Trace */}
                {this.state.showDetails && this.state.error?.stack && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-700 font-medium">Full Stack Trace:</p>
                      <button
                        onClick={this.copyErrorToClipboard}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                    <pre className="text-gray-600 text-xs font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}

                {/* Hook-specific guidance */}
                {isHookError && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <p className="text-blue-700 font-medium mb-2">Common Hook Error Causes:</p>
                    <ul className="text-blue-600 text-sm space-y-1 list-disc list-inside">
                      <li>Calling hooks inside conditions, loops, or nested functions</li>
                      <li>Different number of hooks between renders</li>
                      <li>Hooks called in different order on re-renders</li>
                      <li>Early returns before all hooks are called</li>
                    </ul>
                  </div>
                )}

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
          </div>
        </>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary