
import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./button";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  moduleName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showStack: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      showStack: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  toggleStack = (): void => {
    this.setState(prev => ({ showStack: !prev.showStack }));
  };

  render() {
    const { hasError, error, errorInfo, showStack } = this.state;
    const { children, fallback, showDetails = true, moduleName } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-[300px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-800 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Something went wrong</h2>
                  {moduleName && (
                    <p className="text-red-100 text-sm">Error in: {moduleName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>

              {showDetails && error && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Error Message:
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 font-mono">
                    {error.message}
                  </p>
                </div>
              )}

              {/* Stack trace toggle */}
              {showDetails && errorInfo && (
                <button
                  onClick={this.toggleStack}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  {showStack ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showStack ? 'Hide' : 'Show'} technical details
                </button>
              )}

              {showStack && errorInfo && (
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-auto max-h-48 font-mono">
                  {errorInfo.componentStack}
                </pre>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// ============================================
// SPECIALIZED ERROR BOUNDARIES
// ============================================

/**
 * Error boundary for entire pages
 */
const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary moduleName="Page" showDetails={true}>
    {children}
  </ErrorBoundary>
);

/**
 * Error boundary for feature modules (POS, Kitchen, etc.)
 */
const ModuleErrorBoundary: React.FC<{ 
  children: ReactNode; 
  moduleName: string;
}> = ({ children, moduleName }) => (
  <ErrorBoundary moduleName={moduleName} showDetails={true}>
    {children}
  </ErrorBoundary>
);

/**
 * Error boundary for individual components (widgets, cards)
 */
const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <ErrorBoundary 
    showDetails={false}
    fallback={fallback || (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-center text-gray-500">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
        <p className="text-sm">Failed to load component</p>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Error boundary for charts/analytics
 */
const ChartErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    moduleName="Chart"
    showDetails={false}
    fallback={
      <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
          <p className="text-gray-500 dark:text-gray-400">Chart failed to load</p>
          <p className="text-sm text-gray-400">Please refresh the page</p>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export { 
  ErrorBoundary, 
  PageErrorBoundary, 
  ModuleErrorBoundary, 
  ComponentErrorBoundary, 
  ChartErrorBoundary 
};
