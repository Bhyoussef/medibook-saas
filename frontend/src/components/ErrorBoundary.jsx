import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Log error to service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  logErrorToService = (error, errorInfo) => {
    // In production, you would send this to an error logging service
    // like Sentry, LogRocket, or your own backend
    try {
      fetch(`${import.meta.env.VITE_API_URL || 'https://medibook-saas.onrender.com/api'}/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: error.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(err => {
        console.error('Failed to log error:', err);
      });
    } catch (err) {
      console.error('Error logging service failed:', err);
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (process.env.NODE_ENV === 'development') {
        // Development mode - show detailed error info
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
                <p className="text-gray-600 mb-6">
                  An error occurred while rendering this component.
                </p>
                
                <details className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                  <summary className="cursor-pointer font-semibold text-gray-900 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-2">
                    <p className="text-sm font-mono text-red-600 mb-2">
                      {this.state.error && this.state.error.toString()}
                    </p>
                    <pre className="text-xs text-gray-700 bg-white p-2 rounded overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={this.handleRetry}
                    className="btn-primary"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-secondary"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        // Production mode - show user-friendly error page
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h2>
                <p className="text-gray-600 mb-6">
                  We're sorry, but something unexpected happened. Our team has been notified and is working to fix this issue.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={this.handleRetry}
                    className="btn-primary w-full"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="btn-secondary w-full"
                  >
                    Go to Homepage
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-6">
                  If this problem persists, please contact our support team.
                </p>
              </div>
            </div>
          </div>
        );
      }
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
