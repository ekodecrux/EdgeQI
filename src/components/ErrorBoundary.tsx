// NFR-10: React Error Boundary — catches unhandled render errors and shows a recovery UI
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // In production you'd send this to an error tracking service
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center mb-4">
            <span className="text-rose-600 text-xl font-bold">!</span>
          </div>
          <h2 className="text-sm font-bold text-rose-800 mb-1">Something went wrong</h2>
          <p className="text-xs text-rose-600 max-w-sm mb-4 font-mono">
            {this.state.error?.message || 'An unexpected render error occurred.'}
          </p>
          {this.state.errorInfo && (
            <details className="text-left w-full max-w-md mb-4">
              <summary className="text-[10px] font-mono text-rose-500 cursor-pointer hover:text-rose-700">
                Component stack trace
              </summary>
              <pre className="text-[9px] font-mono text-rose-400 bg-rose-100 p-2 rounded-lg mt-1 overflow-auto max-h-32 whitespace-pre-wrap">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
