// In-app version check + service-worker update plumbing.
//
// Truth source for "what's the latest" is `<base>version.json` published alongside
// the build by `scripts/bump-version.mjs`. The service worker is registered in
// auto-update mode by vite-plugin-pwa, so new bundle assets are fetched in the
// background; this module just gives us a way to *show* that to the user and
// trigger the activation reload on demand.

import { APP_VERSION } from '../version';

export interface RemoteVersion {
  version: string;
  builtAt: string;
}

const LAST_CHECK_KEY = 'last-version-check';

export async function fetchLatestVersion(): Promise<RemoteVersion | null> {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const url = `${base}version.json?cb=${Date.now()}`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    if (typeof j?.version !== 'string') return null;
    saveLastCheck(Date.now());
    return j as RemoteVersion;
  } catch {
    return null;
  }
}

function parseVersion(v: string): [number, number, number] | null {
  const m = (v ?? '').match(/V?(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

/** Returns -1 if a < b, 0 if equal, 1 if a > b, null if either unparseable. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

export function isBehind(latest: string | null | undefined): boolean {
  if (!latest) return false;
  return compareVersions(APP_VERSION, latest) === -1;
}

export function loadLastCheck(): number | null {
  const raw = localStorage.getItem(LAST_CHECK_KEY);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isFinite(n) ? n : null;
}
export function saveLastCheck(ts: number): void {
  localStorage.setItem(LAST_CHECK_KEY, String(ts));
}

/** Asks any installed service worker to recheck for a new build. */
export async function checkForServiceWorkerUpdate(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.update();
  } catch {
    /* no-op */
  }
}

/** Activates a waiting service worker (if any) and reloads to apply. */
export async function applyServiceWorkerUpdate(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    location.reload();
    return;
  }
  let reloaded = false;
  const reload = () => { if (!reloaded) { reloaded = true; location.reload(); } };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const waiting = reg?.waiting ?? reg?.installing ?? null;
    if (waiting) {
      try { waiting.postMessage({ type: 'SKIP_WAITING' }); } catch { /* ignore */ }
    }
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
  } catch {
    /* fall through */
  }
  // Safety fallback — guarantees the user gets the new bundle even if the SW path stalls.
  setTimeout(reload, 1500);
}
