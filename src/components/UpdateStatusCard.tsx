import { useEffect, useState } from 'react';
import { APP_VERSION } from '../version';
import {
  applyServiceWorkerUpdate,
  checkForServiceWorkerUpdate,
  compareVersions,
  fetchLatestVersion,
  loadLastCheck,
  RemoteVersion
} from '../lib/version-check';

type Status = 'unknown' | 'up-to-date' | 'behind';

export function UpdateStatusCard() {
  const [latest, setLatest] = useState<RemoteVersion | null>(null);
  const [status, setStatus] = useState<Status>('unknown');
  const [checking, setChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(loadLastCheck());

  const runCheck = async () => {
    setChecking(true);
    checkForServiceWorkerUpdate();
    const v = await fetchLatestVersion();
    setLatest(v);
    setLastCheckedAt(Date.now());
    if (!v) {
      setStatus('unknown');
    } else {
      const cmp = compareVersions(APP_VERSION, v.version);
      setStatus(cmp === -1 ? 'behind' : 'up-to-date');
    }
    setChecking(false);
  };

  useEffect(() => { runCheck(); }, []);

  const tone =
    status === 'behind' ? 'amber' :
    status === 'up-to-date' ? 'emerald' :
    'slate';
  const toneClass: Record<typeof tone, string> = {
    amber: 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/20',
    emerald: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-900/20',
    slate: ''
  };

  return (
    <section className={`card card-pad space-y-3 lg:col-span-2 ${toneClass[tone]}`}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="text-2xl">
          {status === 'behind' ? '✨' : status === 'up-to-date' ? '✅' : '🔄'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">App update</div>
          <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            {status === 'up-to-date' && (
              <>You're on the latest version (<span className="font-mono">{APP_VERSION}</span>).</>
            )}
            {status === 'behind' && (
              <>An update is available. You're on <span className="font-mono">{APP_VERSION}</span> · Latest: <span className="font-mono">{latest?.version}</span>.</>
            )}
            {status === 'unknown' && (
              <>Couldn't reach the update server. You're on <span className="font-mono">{APP_VERSION}</span>.</>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {lastCheckedAt ? `Last checked ${formatRelative(lastCheckedAt)}` : 'Never checked yet'}
            {latest?.builtAt && status !== 'unknown' && <> · Latest build {new Date(latest.builtAt).toLocaleString('en-GB')}</>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={runCheck} disabled={checking}>
          {checking ? 'Checking…' : '🔄 Check for updates'}
        </button>
        {status === 'behind' && (
          <button className="btn-primary" onClick={() => applyServiceWorkerUpdate()}>
            Reload to apply update
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        Updates are downloaded automatically in the background. Reloading applies the
        new version to this tab — your saved data is unaffected.
      </p>
    </section>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  return `${day} day${day === 1 ? '' : 's'} ago`;
}
