import { useMemo, useState } from 'react';
import { Field, PageHeader, StatCard } from '../components/common';
import { mortgageMonthly, mortgageSchedule, stampDuty } from '../lib/uk-tools';
import { computeTax } from '../lib/uk-tax';
import { useFinanceStore } from '../store/useFinanceStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { annualAmount, isActive } from '../lib/frequency';

type Tab = 'stamp' | 'mortgage' | 'emergency' | 'payrise' | 'marriage';

export function Tools() {
  const [tab, setTab] = useState<Tab>('stamp');
  return (
    <div>
      <PageHeader title="UK Tools" subtitle="Quick calculators for common UK money decisions" />
      <div className="flex flex-wrap gap-2 mb-5">
        <TabBtn k="stamp" tab={tab} set={setTab}>🏠 Stamp Duty</TabBtn>
        <TabBtn k="mortgage" tab={tab} set={setTab}>📑 Mortgage</TabBtn>
        <TabBtn k="emergency" tab={tab} set={setTab}>🛡️ Emergency fund</TabBtn>
        <TabBtn k="payrise" tab={tab} set={setTab}>📈 Pay rise</TabBtn>
        <TabBtn k="marriage" tab={tab} set={setTab}>💍 Marriage Allowance</TabBtn>
      </div>
      {tab === 'stamp' && <StampDutyTool />}
      {tab === 'mortgage' && <MortgageTool />}
      {tab === 'emergency' && <EmergencyFundTool />}
      {tab === 'payrise' && <PayRiseTool />}
      {tab === 'marriage' && <MarriageTool />}
    </div>
  );
}

function TabBtn({ k, tab, set, children }: { k: Tab; tab: Tab; set: (t: Tab) => void; children: React.ReactNode }) {
  return (
    <button className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`} onClick={() => set(k)}>
      {children}
    </button>
  );
}

function StampDutyTool() {
  const [price, setPrice] = useState(280_000);
  const [ftb, setFtb] = useState(false);
  const [extra, setExtra] = useState(false);
  const r = stampDuty({ price, firstTimeBuyer: ftb, additionalProperty: extra });
  return (
    <div className="grid lg:grid-cols-[1fr_2fr] gap-5">
      <div className="card card-pad space-y-3">
        <Field label="Property price £"><input className="input" type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ftb} onChange={e => setFtb(e.target.checked)} /> First-time buyer</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={extra} onChange={e => setExtra(e.target.checked)} /> Additional property (5% surcharge)</label>
        <p className="text-xs text-slate-500">England & NI bands (April 2025+). Wales (LTT) and Scotland (LBTT) differ.</p>
      </div>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <StatCard label="SDLT" value={fmt(r.tax)} accent="text-rose-500" />
          <StatCard label="Effective rate" value={(r.effective * 100).toFixed(2) + '%'} />
        </div>
        <div className="card card-pad">
          <div className="font-semibold mb-2">Band breakdown</div>
          <table className="w-full text-sm">
            <thead><tr><th className="table-th">From</th><th className="table-th">To</th><th className="table-th">Rate</th><th className="table-th">Tax</th></tr></thead>
            <tbody>
              {r.bands.map((b, i) => (
                <tr key={i}><td className="table-td">{fmt(b.from)}</td><td className="table-td">{fmt(b.to)}</td><td className="table-td">{(b.rate * 100).toFixed(0)}%</td><td className="table-td">{fmt(b.tax)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MortgageTool() {
  const [price, setPrice] = useState(280_000);
  const [deposit, setDeposit] = useState(28_000);
  const [rate, setRate] = useState(4.5);
  const [years, setYears] = useState(25);
  const principal = Math.max(0, price - deposit);
  const sched = useMemo(() => mortgageSchedule(principal, rate, years), [principal, rate, years]);
  return (
    <div className="grid lg:grid-cols-[1fr_2fr] gap-5">
      <div className="card card-pad space-y-3">
        <Field label="Property price £"><input className="input" type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Deposit £"><input className="input" type="number" value={deposit} onChange={e => setDeposit(parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Interest rate %"><input className="input" type="number" step="0.05" value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Term (years)"><input className="input" type="number" value={years} onChange={e => setYears(parseFloat(e.target.value) || 0)} /></Field>
      </div>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <StatCard label="Monthly payment" value={fmt(sched.monthly)} accent="text-rose-500" />
          <StatCard label="Total interest" value={fmt(sched.totalInterest)} />
          <StatCard label="Total paid" value={fmt(sched.totalPaid)} />
        </div>
        <div className="card card-pad h-72">
          <ResponsiveContainer>
            <LineChart data={sched.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="month" tickFormatter={m => `${(m / 12).toFixed(0)}y`} />
              <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v as number)} labelFormatter={l => `Month ${l}`} />
              <Legend />
              <Line type="monotone" dataKey="balance" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Balance" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function EmergencyFundTool() {
  const state = useFinanceStore(s => s.state);
  const [months, setMonths] = useState(3);
  const monthlyEssentials = useMemo(() => {
    const now = new Date();
    const essentialNames = ['cat-housing', 'cat-utilities', 'cat-food', 'cat-transport', 'cat-insurance'];
    const ess = state.payments.filter(p =>
      p.kind === 'bill' && isActive(p, now) && essentialNames.includes(p.categoryId)
    );
    return ess.reduce((s, p) => s + annualAmount(p.amount, p.frequency) / 12, 0);
  }, [state.payments]);
  const cashAssets = (state.assets ?? []).filter(a => a.type === 'cash').reduce((s, a) => s + a.value, 0);
  const target = monthlyEssentials * months;
  const ratio = target > 0 ? Math.min(100, (cashAssets / target) * 100) : 0;
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card card-pad">
        <Field label="Months of essentials to cover">
          <input className="input" type="number" min={1} max={12} value={months} onChange={e => setMonths(parseInt(e.target.value) || 0)} />
        </Field>
        <p className="text-xs text-slate-500 mt-2">Common rule of thumb: 3 months for stable employment, 6 months for self-employed or single-earner households.</p>
      </div>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <StatCard label="Monthly essentials" value={fmt(monthlyEssentials)} hint="Housing, utilities, food, transport, insurance" />
          <StatCard label="Target fund" value={fmt(target)} accent="text-sky-500" />
          <StatCard label="Cash assets" value={fmt(cashAssets)} accent={cashAssets >= target ? 'text-emerald-500' : 'text-amber-500'} />
        </div>
        <div className="card card-pad">
          <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: ratio + '%' }} />
          </div>
          <div className="text-xs text-slate-500 mt-2">{ratio.toFixed(0)}% of target reached</div>
        </div>
      </div>
    </div>
  );
}

function PayRiseTool() {
  const profile = useFinanceStore(s => s.state.profile);
  const sideIncomes = useFinanceStore(s => s.state.sideIncomes);
  const [delta, setDelta] = useState(3000);
  const before = useMemo(() => computeTax(profile, sideIncomes), [profile, sideIncomes]);
  const after = useMemo(() => computeTax({ ...profile, salary: profile.salary + delta }, sideIncomes), [profile, sideIncomes, delta]);
  const grossDelta = delta;
  const netDelta = after.takeHome - before.takeHome;
  const keptPct = grossDelta > 0 ? (netDelta / grossDelta) * 100 : 0;
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card card-pad space-y-3">
        <Field label="Pay rise (£/yr gross)"><input className="input" type="number" value={delta} onChange={e => setDelta(parseFloat(e.target.value) || 0)} /></Field>
        <p className="text-xs text-slate-500">Calculated using your current tax code, region, NI class, pension contributions, and student loan plans.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Take-home before" value={fmt(before.takeHome)} />
        <StatCard label="Take-home after" value={fmt(after.takeHome)} accent="text-emerald-500" />
        <StatCard label="Annual net gain" value={fmt(netDelta)} hint={`Monthly +${fmt(netDelta / 12)}`} accent="text-sky-500" />
        <StatCard label="% of rise kept" value={keptPct.toFixed(0) + '%'} hint={keptPct < 50 ? 'High-rate or PA-taper territory' : ''} />
      </div>
    </div>
  );
}

function MarriageTool() {
  return (
    <div className="card card-pad text-sm space-y-2 max-w-3xl">
      <h2 className="text-lg font-bold">💍 Marriage Allowance</h2>
      <p>If you and your spouse/civil partner are both UK residents, one of you doesn't pay tax (i.e. earns under the Personal Allowance, £12,570) and the other is a basic-rate taxpayer, you can transfer £1,260 of unused Personal Allowance.</p>
      <p>This currently saves the receiving partner up to <strong>£252/year</strong> in tax (20% × £1,260).</p>
      <p>Set this on the <strong>Income & Tax</strong> page using the Marriage Allowance dropdown — it then flows through your take-home calculation across the app.</p>
      <p className="text-xs text-slate-500">Apply on gov.uk — claims can usually be backdated up to 4 years.</p>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0); }
