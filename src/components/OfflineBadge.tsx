import { useEffect, useState } from 'react';

export function OfflineBadge() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);
  if (online) return null;
  return (
    <div className="no-print fixed top-[calc(env(safe-area-inset-top)+3.5rem)] left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs border border-amber-200 dark:border-amber-800">
      📡 Offline — your data is saved locally
    </div>
  );
}
