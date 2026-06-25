import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from './ui/Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("FinSathi App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 font-inter">
          <div className="max-w-md w-full bg-white rounded-[40px] p-12 shadow-[0_20px_70px_rgba(0,0,0,0.05)] border border-slate-100 text-center animate-scale-in">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[24px] flex items-center justify-center mx-auto mb-8">
              <AlertTriangle size={40} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">System Glitch</h1>
            <p className="text-slate-500 mt-4 mb-10 text-sm leading-relaxed">
              FinSathi encountered an unexpected rendering error. This usually happens due to a network timeout or a temporary module failure.
              {this.state.error?.message && (
                <code className="block font-mono text-[10px] mt-4 text-rose-500 bg-rose-50/80 p-3 rounded-2xl border border-rose-100/50 break-all">
                  Error: {this.state.error.message}
                </code>
              )}
            </p>
            <div className="space-y-3">
               <Button 
                onClick={() => window.location.reload()} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 rounded-2xl gap-3 font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200"
              >
                <RefreshCcw size={18} /> Recover Session
              </Button>
              <Button 
                variant="ghost"
                onClick={() => window.location.href = '/dashboard'} 
                className="w-full text-slate-400 font-bold text-xs"
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
