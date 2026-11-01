import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Application Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  handleClearSession = () => {
    localStorage.removeItem('sunpower_token');
    localStorage.removeItem('sunpower_user');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF6F9] flex items-center justify-center p-6 text-[#241621]">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-[#EBDCE7] text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 text-2xl font-black">
              ⚠️
            </div>
            <div>
              <h2 className="text-xl font-black text-[#241621]">Something went wrong</h2>
              <p className="text-xs text-slate-500 mt-1">
                The application encountered an unexpected state. You can reload or reset your session below.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-mono text-left break-words">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#8E5A81] text-white font-bold text-xs shadow-md shadow-[#714B67]/20 hover:opacity-95 cursor-pointer"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 rounded-xl bg-[#F5EDF3] hover:bg-[#EBDCE7] text-[#714B67] font-bold text-xs border border-[#EBDCE7] cursor-pointer"
              >
                Return to Dashboard
              </button>
              <button
                type="button"
                onClick={this.handleClearSession}
                className="text-[11px] text-slate-400 hover:text-rose-600 underline cursor-pointer mt-1"
              >
                Clear local session & go to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
