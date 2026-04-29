import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, PageHeader, GovLinks } from '../components/common';
import { isAppInstalled, platform } from '../components/InstallPrompt';
import { UpdateStatusCard } from '../components/UpdateStatusCard';
import { GOV_UK } from '../lib/gov-uk-links';

export function Settings() {
  const profile = useFinanceStore(s => s.state.profile);
  const setProfile = useFinanceStore(s => s.setProfile);
  const unlock = useFinanceStore(s => s.unlock);
  const setPassword = useFinanceStore(s => s.setPassword);
  const removePassword = useFinanceStore(s => s.removePassword);
  const wipeAll = useFinanceStore(s => s.wipeAll);
  const loadDemo = useFinanceStore(s => s.loadDemo);

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [removeCurrent, setRemoveCurrent] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Personalisation, theme, password, and data controls" />

      <div className="grid lg:grid-cols-2 gap-5">
        <UpdateStatusCard />

        <section className="card card-pad space-y-3">
          <div className="font-semibold">Personalisation</div>
          <Field label="First name (used on dashboard)">
            <input className="input" value={profile.firstName} onChange={e => setProfile({ firstName: e.target.value })} />
          </Field>
          <Field label="Theme">
            <select className="input" value={profile.themePref} onChange={e => setProfile({ themePref: e.target.value as any })}>
              <option value="system">Match system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
        </section>

        <section className="card card-pad space-y-3">
          <div className="font-semibold">Password</div>
          {unlock.encrypted ? (
            <>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">🔒 Your data is encrypted with a password.</p>
              <Field label="Enter current password to remove encryption">
                <input className="input" type="password" value={removeCurrent} onChange={e => setRemoveCurrent(e.target.value)} />
              </Field>
              <button className="btn-secondary" onClick={async () => {
                const ok = await removePassword(removeCurrent);
                setMsg(ok ? 'Password removed.' : 'Wrong password.');
                setRemoveCurrent('');
              }}>Remove password</button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">Set a password to encrypt all data on this device. The only recovery from a lost password is to wipe data.</p>
              <Field label="New password"><input className="input" type="password" value={pw1} onChange={e => setPw1(e.target.value)} /></Field>
              <Field label="Confirm new password"><input className="input" type="password" value={pw2} onChange={e => setPw2(e.target.value)} /></Field>
              <button className="btn-primary" disabled={!pw1 || pw1 !== pw2} onClick={async () => {
                await setPassword(pw1);
                setMsg('Password set. Data will encrypt on next change.');
                setPw1(''); setPw2('');
              }}>Set password</button>
            </>
          )}
          {msg && <div className="text-sm text-slate-500">{msg}</div>}
        </section>

        <InstallSection />

        <section className="card card-pad space-y-3 lg:col-span-2">
          <div className="font-semibold">Quick actions</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => { if (confirm('Load demo data? This will overwrite your profile, payments, holidays, events, assets and budgets.')) loadDemo(); }}>
              ✨ Load demo data
            </button>
            <button className="btn-secondary" onClick={() => window.print()}>🖨️ Print page</button>
          </div>
          <p className="text-xs text-slate-500">Demo data is just sample numbers — overwrite with your real figures any time.</p>
        </section>

        <section className="card card-pad space-y-3 lg:col-span-2 border-red-200 dark:border-red-800">
          <div className="font-semibold text-red-600">Danger zone</div>
          <p className="text-sm text-slate-500">Wipes everything: profile, bills, debts, savings, holidays, calendar events, calculator memory, and password.</p>
          {!confirmWipe ? (
            <button className="btn-danger" onClick={() => setConfirmWipe(true)}>Wipe all data</button>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm">Are you absolutely sure?</span>
              <button className="btn-danger" onClick={async () => { await wipeAll(); setConfirmWipe(false); }}>Yes, wipe</button>
              <button className="btn-ghost" onClick={() => setConfirmWipe(false)}>Cancel</button>
            </div>
          )}
        </section>
      </div>

      <div className="text-xs text-slate-500 mt-6">
        Estimates here are guidance only based on UK 2025/26 reference figures. Verify against gov.uk before relying on them.
      </div>
      <div className="mt-3 max-w-xl">
        <GovLinks title="Useful gov.uk references" links={GOV_UK.general} />
      </div>
    </div>
  );
}

function InstallSection() {
  const [installed, setInstalled] = useState(isAppInstalled());
  const p = platform();

  useEffect(() => {
    const m = window.matchMedia('(display-mode: standalone)');
    const fn = () => setInstalled(isAppInstalled());
    m.addEventListener?.('change', fn);
    return () => m.removeEventListener?.('change', fn);
  }, []);

  return (
    <section className="card card-pad space-y-3 lg:col-span-2">
      <div className="font-semibold">📲 Install on your device</div>
      {installed ? (
        <div className="text-sm text-emerald-600 dark:text-emerald-400">✓ Installed — running as a standalone app.</div>
      ) : (
        <>
          {p === 'ios' && (
            <ol className="text-sm text-slate-600 dark:text-slate-300 list-decimal pl-5 space-y-1">
              <li>Open this page in <strong>Safari</strong> on your iPhone or iPad.</li>
              <li>Tap the <strong>Share</strong> button (square with arrow).</li>
              <li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li>
              <li>The app launches full-screen and works fully offline.</li>
            </ol>
          )}
          {p === 'android' && (
            <ol className="text-sm text-slate-600 dark:text-slate-300 list-decimal pl-5 space-y-1">
              <li>Open this page in <strong>Chrome</strong> or <strong>Edge</strong>.</li>
              <li>Tap the menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li>Confirm. The app appears in your launcher and works offline.</li>
            </ol>
          )}
          {p === 'desktop' && (
            <ol className="text-sm text-slate-600 dark:text-slate-300 list-decimal pl-5 space-y-1">
              <li>In Chrome / Edge, click the install icon (▭+) in the address bar, or use the menu → <strong>Install app</strong>.</li>
              <li>The app gets its own window, dock/taskbar icon, and works offline.</li>
            </ol>
          )}
          <div className="text-xs text-slate-500">
            This is a Progressive Web App — no app store needed. All data stays on your device.
          </div>
        </>
      )}
    </section>
  );
}
