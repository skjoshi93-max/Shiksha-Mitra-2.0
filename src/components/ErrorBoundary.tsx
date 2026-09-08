import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  id?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Workspace Crash Shield intercepted error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          id={this.props.id || 'error-boundary-fallback'}
          className="p-6 sm:p-8 rounded-3xl bg-amber-50/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-900/50 shadow-lg text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center text-center my-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight mb-2">
            {this.props.fallbackTitle || 'Component Rendering Safeguard'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mb-5 leading-relaxed">
            A rendering exception was gracefully caught and isolated to prevent app interruption.
            {this.state.error?.message ? ` (${this.state.error.message})` : ''}
          </p>
          <button
            id="btn-error-boundary-retry"
            onClick={this.handleReset}
            className="btn-3d-indigo text-xs py-2 px-4 inline-flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore & Reload View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
