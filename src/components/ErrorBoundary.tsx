import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * Catches rendering crashes so the coach sees what went wrong (and can screenshot it)
 * instead of a blank screen. Logged data is already saved, so a reload is always safe.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const details = [
      `${error.name}: ${error.message}`,
      `Screen: ${location.hash || '#/'}`,
      `When: ${new Date().toLocaleString()}`,
      `Browser: ${navigator.userAgent}`,
      (error.stack ?? '').split('\n').slice(1, 6).join('\n'),
    ].join('\n');

    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-8">
        <h1 className="font-display text-[34px] leading-none font-bold">Something went wrong</h1>
        <p className="text-[15px] text-fg-2">
          Your games and shots are saved. Reload to keep going, and send a screenshot of the details below so it can be
          fixed.
        </p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="h-14 rounded-2xl fill-save text-[17px] font-extrabold text-save-ink"
        >
          Reload
        </button>
        <pre className="overflow-x-auto rounded-2xl surface border border-line p-4 text-xs leading-relaxed whitespace-pre-wrap text-muted">
          {details}
        </pre>
      </div>
    );
  }
}
