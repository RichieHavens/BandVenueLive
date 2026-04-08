import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any | null;
}

export default class SupabaseErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    let errorInfo = null;
    try {
      // Try to parse the JSON stringified error context
      errorInfo = JSON.parse(error.message);
    } catch (e) {
      // Not a JSON error, use standard error
    }
    return { hasError: true, error, errorInfo };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null } as State);
    window.location.reload();
  };

  private handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isPermissionDenied = this.state.errorInfo?.error?.toLowerCase().includes('permission denied') || 
                                 this.state.errorInfo?.error?.toLowerCase().includes('insufficient permissions');

      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <ShieldAlert className="text-red-500" size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">
              {isPermissionDenied ? 'Access Restricted' : 'Something Went Wrong'}
            </h2>
            
            <p className="text-neutral-400 mb-8 leading-relaxed">
              {isPermissionDenied 
                ? "You don't have the required permissions to perform this action or view this data. Please check your account roles."
                : "An unexpected error occurred while communicating with our database. Our team has been notified."}
            </p>

            {this.state.errorInfo && (
              <div className="mb-8 p-4 bg-black/40 rounded-2xl border border-neutral-800 text-left overflow-hidden">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Error Details</p>
                <div className="font-mono text-[10px] text-red-400/80 break-all whitespace-pre-wrap">
                  {JSON.stringify(this.state.errorInfo, null, 2)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              
              <button
                onClick={this.handleLogout}
                className="flex items-center justify-center gap-2 w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-4 rounded-2xl transition-all"
              >
                <LogOut size={18} />
                Sign Out & Re-login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
