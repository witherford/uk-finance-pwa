import React from 'react';
import { db } from '../store/db';

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Caught by ErrorBoundary:', error, info);
  }

  private async unregisterServiceWorkers() {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      regs?.forEach(r => r.unregister());
    } catch {}
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch {}
  }

  private async wipeAndReload() {
    try { await db.delete(); } catch {}
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    await this.unregisterServiceWorkers();
    location.replace(import.meta.env.BASE_URL || '/');
  }

  private async softReload() {
    await this.unregisterServiceWorkers();
    location.reload();
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="card card-pad max-w-md w-full">
          <h1 className="text-xl font-bold mb-2">⚠️ Something went wrong</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            The app crashed while rendering. This often happens after importing a spreadsheet
            with malformed dates or values.
          </p>
          {this.state.error?.message && (
            <pre className="text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-auto max-h-32 mb-3">{this.state.error.message}</pre>
          )}
          <p className="text-sm font-semibold mb-2">Try in this order:</p>
          <ol className="list-decimal pl-5 text-sm space-y-1 mb-4">
            <li>Reload (clears the cached page; your data is kept).</li>
            <li>Reload + clear caches (for stale service-worker issues).</li>
            <li>Wipe data and start fresh (last resort — irreversible).</li>
          </ol>
          <div className="flex flex-col gap-2">
            <button className="btn-primary justify-center" onClick={() => location.reload()}>↻ Reload</button>
            <button className="btn-secondary justify-center" onClick={() => this.softReload()}>🧹 Reload + clear caches</button>
            <button className="btn-danger justify-center" onClick={() => {
              if (confirm('Wipe ALL app data and start fresh? This cannot be undone.')) this.wipeAndReload();
            }}>💣 Wipe data and start fresh</button>
          </div>
        </div>
      </div>
    );
  }
}
