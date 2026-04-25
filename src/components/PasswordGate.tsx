import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';

export function PasswordGate() {
  const unlock = useFinanceStore(s => s.unlock);
  const unlockWith = useFinanceStore(s => s.unlockWith);
  const wipeAll = useFinanceStore(s => s.wipeAll);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  if (!unlock.bootstrapped) return <FullScreen><div className="text-slate-500">Loading…</div></FullScreen>;
  if (unlock.unlocked) return null;

  return (
    <FullScreen>
      <div className="card card-pad max-w-sm w-full">
        <h1 className="text-xl font-bold mb-1">🔒 Locked</h1>
        <p className="text-sm text-slate-500 mb-4">Enter your password to unlock your finance vault.</p>
        <form onSubmit={async e => {
          e.preventDefault();
          setBusy(true);
          await unlockWith(pw);
          setBusy(false);
        }}>
          <input
            autoFocus
            className="input mb-3"
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Password"
          />
          {unlock.error && <div className="text-sm text-red-500 mb-3">{unlock.error}</div>}
          <button className="btn-primary w-full justify-center" disabled={busy}>Unlock</button>
        </form>

        <div className="mt-6 text-xs text-slate-500">
          Forgot your password? The only way to recover is to wipe all data and start fresh.
        </div>
        {!confirmWipe ? (
          <button className="btn-ghost mt-2 text-red-500" onClick={() => setConfirmWipe(true)}>Wipe & start fresh</button>
        ) : (
          <div className="mt-3 p-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <p className="text-sm mb-2">This permanently deletes all data. Continue?</p>
            <div className="flex gap-2">
              <button className="btn-danger" onClick={() => wipeAll()}>Yes, wipe everything</button>
              <button className="btn-ghost" onClick={() => setConfirmWipe(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </FullScreen>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      {children}
    </div>
  );
}
