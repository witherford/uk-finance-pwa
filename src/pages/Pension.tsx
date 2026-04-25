import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, PageHeader, StatCard } from '../components/common';
import { projectPension } from '../lib/savings';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export function Pension() {
  const profile = useFinanceStore(s => s.state.profile);
  const setProfile = useFinanceStore(s => s.setProfile);
  const [growth, setGrowth] = useState(5);
  const [startPot, setStartPot] = useState(0);

  const proj = projectPension({
    currentAge: profile.age,
    retirementAge: profile.retirementAge,
    salary: profile.salary,
    employeePct: profile.pensionPct,
    employerPct: profile.employerPensionPct,
    annualGrowthPct: growth,
    startPot
  });

  return (
    <div>
      <PageHeader title="Pension projection" subtitle="Combine your contributions, employer match, and assumed growth" />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card card-pad space-y-3">
          <Field label="Current age"><input className="input" type="number" value={profile.age} onChange={e => setProfile({ age: parseInt(e.target.value) || 0 })} /></Field>
          <Field label="Retirement age"><input className="input" type="number" value={profile.retirementAge} onChange={e => setProfile({ retirementAge: parseInt(e.target.value) || 0 })} /></Field>
          <Field label="Annual salary £"><input className="input" type="number" value={profile.salary} onChange={e => setProfile({ salary: parseFloat(e.target.value) || 0 })} /></Field>
          <Field label="Your contribution %"><input className="input" type="number" step="0.1" value={profile.pensionPct} onChange={e => setProfile({ pensionPct: parseFloat(e.target.value) || 0 })} /></Field>
          <Field label="Employer contribution %"><input className="input" type="number" step="0.1" value={profile.employerPensionPct} onChange={e => setProfile({ employerPensionPct: parseFloat(e.target.value) || 0 })} /></Field>
          <Field label="Assumed annual growth %"><input className="input" type="number" step="0.1" value={growth} onChange={e => setGrowth(parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Existing pot £"><input className="input" type="number" value={startPot} onChange={e => setStartPot(parseFloat(e.target.value) || 0)} /></Field>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <StatCard label="Years until retirement" value={String(Math.max(0, profile.retirementAge - profile.age))} />
            <StatCard label="Annual contribution" value={fmt(profile.salary * (profile.pensionPct + profile.employerPensionPct) / 100)} hint="You + employer" />
            <StatCard label="Projected pot at retirement" value={fmt(proj.finalBalance)} accent="text-emerald-500" />
          </div>
          <div className="card card-pad h-80">
            <ResponsiveContainer>
              <LineChart data={proj.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="month" tickFormatter={m => `${(m / 12).toFixed(0)}y`} />
                <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmt(v as number)} labelFormatter={l => `Month ${l}`} />
                <Legend />
                <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} dot={false} name="Pot" />
                <Line type="monotone" dataKey="contributions" stroke="#94a3b8" strokeWidth={2} dot={false} name="Contributions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0); }
