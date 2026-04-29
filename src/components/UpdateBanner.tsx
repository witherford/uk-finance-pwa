import { useEffect, useState } from 'react';
import { APP_VERSION } from '../version';
import { applyServiceWorkerUpdate, checkForServiceWorkerUpdate, fetchLatestVersion, isBehind, RemoteVersion } from '../lib/version-check';

const SESSION_DISMISS_KEY = 'update-banner-dismissed-session';
const POLL_MS = 30 * 60 * 1000; // 30 min

export function UpdateBanner() {
  const [latest, setLatest] = useState<RemoteVersion | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => sessionStorage.getItem(SESSION_DISMISS_KEY) === '1');

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      // Run both in parallel — SW background pull AND remote version probe.
      checkForServiceWorkerUpdate();
      const v = await fetchLatestVersion();
      if (!cancelled) setLatest(v);
    };
    refresh();
    const id = window.setInterval(refresh, POLL_MS);

    // If the SW activates a new build while the page is open, re-check.
    const onCtrlChange = () => refresh();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onCtrlChange);
    }
    // Also re-check when the user comes back to the tab.
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('controllerchange', onCtrlChange);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const behind = isBehind(latest?.version);
  if (!behind || dismissed) return null;

  return (
    <div className="no-print fixed top-[calc(env(safe-area-inset-top)+3.5rem)] left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md">
      <div className="card card-pad shadow-lg flex items-center gap-3 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30">
        <span className="text-2xl shrink-0">✨</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Update available</div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            You're on <span className="font-mono">{APP_VERSION}</span> · Latest: <span className="font-mono">{latest?.version}</span>
          </div>
        </div>
        <button
          className="btn-primary !py-1.5 !px-3 text-sm whitespace-nowrap"
          onClick={() => applyServiceWorkerUpdate()}
        >
          Reload
        </button>
        <button
          className="btn-ghost !py-1 !px-2 text-slate-400"
          aria-label="Dismiss"
          onClick={() => { sessionStorage.setItem(SESSION_DISMISS_KEY, '1'); setDismissed(true); }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
