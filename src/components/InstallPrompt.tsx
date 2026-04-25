import { useEffect, useState } from 'react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'install-prompt-dismissed-at';
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS
    (window.navigator as any).standalone === true
  );
}

function isIos(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && 'ontouchend' in document);
}

function isAndroid(): boolean {
  return /android/i.test(window.navigator.userAgent);
}

function recentlyDismissed(): boolean {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  const days = (Date.now() - parseInt(ts, 10)) / (1000 * 60 * 60 * 24);
  return days < DISMISS_DAYS;
}

export function InstallPrompt() {
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    if (installed) return;
    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    const onInstalled = () => { setInstalled(true); setBip(null); };
    window.addEventListener('appinstalled', onInstalled);

    if (isIos() && !isStandalone() && !recentlyDismissed()) {
      // delay so it's not jarring on first paint
      const t = window.setTimeout(() => setShowIos(true), 1500);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBip);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [installed]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setBip(null);
    setShowIos(false);
  };

  const install = async () => {
    if (!bip) return;
    await bip.prompt();
    const choice = await bip.userChoice;
    if (choice.outcome === 'dismissed') dismiss();
    setBip(null);
  };

  if (installed) return null;

  // Android / desktop Chromium with native prompt
  if (bip && !recentlyDismissed()) {
    return (
      <div className="no-print fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 z-40 max-w-sm">
        <div className="card card-pad shadow-lg flex items-start gap-3">
          <span className="text-2xl">📲</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Install UK Finance</div>
            <div className="text-xs text-slate-500 mt-1">
              Add it to your home screen for offline use and a full-screen experience.
            </div>
            <div className="mt-3 flex gap-2">
              <button className="btn-primary !py-1.5 !px-3 text-sm" onClick={install}>Install</button>
              <button className="btn-ghost !py-1.5 !px-3 text-sm" onClick={dismiss}>Not now</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // iOS instructions overlay
  if (showIos) {
    return (
      <div className="no-print fixed bottom-0 left-0 right-0 z-40 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="card card-pad shadow-xl max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📲</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Install on iPhone / iPad</div>
              <ol className="text-xs text-slate-600 dark:text-slate-300 mt-2 space-y-1 list-decimal pl-4">
                <li>Tap the <strong>Share</strong> button <span aria-hidden>⬆️</span> in Safari.</li>
                <li>Choose <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong>. The app opens like a native one — fully offline.</li>
              </ol>
              <div className="mt-3 flex justify-end">
                <button className="btn-ghost !py-1.5 !px-3 text-sm" onClick={dismiss}>Got it</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function isAppInstalled(): boolean {
  return isStandalone();
}

export function platform(): 'ios' | 'android' | 'desktop' {
  if (isIos()) return 'ios';
  if (isAndroid()) return 'android';
  return 'desktop';
}
