import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import Button from './ui/Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Karobar App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-app-bg text-app-text p-6 antialiased">
          <div className="max-w-md w-full bg-app-surface rounded-modal p-8 shadow-modal border border-app-border text-center animate-fade-in">
            <div className="w-16 h-16 bg-app-danger-subtle text-app-danger rounded-panel flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-section-heading font-semibold text-app-text tracking-tight">System Glitch</h1>
            <p className="text-small text-app-text-secondary mt-2 mb-6 leading-relaxed">
              Karobar encountered an unexpected interface error. This usually happens due to a network timeout or temporary bundle mismatch.
              {this.state.error?.message && (
                <code className="block font-mono text-micro mt-3 text-app-danger bg-app-danger-subtle p-3 rounded-card border border-app-danger/20 break-all text-left">
                  {this.state.error.message}
                </code>
              )}
            </p>
            <div className="flex flex-col gap-2.5">
              <Button 
                variant="primary"
                onClick={() => window.location.reload()} 
                icon={<RefreshCcw size={15} />}
                className="w-full"
              >
                Reload Application
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'} 
                icon={<Home size={15} />}
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
