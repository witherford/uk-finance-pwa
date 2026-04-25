import React from 'react';
import { Frequency } from '../types';
import { FREQUENCIES } from '../lib/frequency';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-5">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="card card-pad">
      <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ?? ''}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

export function FrequencySelect({ value, onChange, includeOneOff = true }: { value: Frequency; onChange: (f: Frequency) => void; includeOneOff?: boolean }) {
  return (
    <select className="input" value={value} onChange={e => onChange(e.target.value as Frequency)}>
      {FREQUENCIES.filter(f => includeOneOff || f.value !== 'oneoff').map(f => (
        <option key={f.value} value={f.value}>{f.label}</option>
      ))}
    </select>
  );
}

export function Money({ value, className = '' }: { value: number; className?: string }) {
  const s = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value || 0);
  return <span className={`tabular-nums ${className}`}>{s}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card card-pad text-center text-slate-500 text-sm">{children}</div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

/**
 * Numeric input that:
 *  - shows empty (placeholder) when value is 0, so the leading "0" doesn't get in the way of typing
 *  - allows clean typing of decimals incl. partial states like "1." while editing
 *  - selects all on focus (mobile-friendly)
 */
export function NumInput({
  value, onChange, step, min, max, placeholder, className, ariaLabel
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number | string;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = React.useState<string>(value === 0 ? '' : String(value));
  React.useEffect(() => {
    // Sync external value changes only if they differ from the parsed text we already show.
    const parsed = parseFloat(text);
    if (value !== (isNaN(parsed) ? 0 : parsed)) {
      setText(value === 0 ? '' : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      className={className ?? 'input'}
      type="text"
      inputMode="decimal"
      pattern="[0-9.\\-]*"
      placeholder={placeholder ?? '0'}
      step={step}
      aria-label={ariaLabel}
      value={text}
      onChange={e => {
        const v = e.target.value;
        // allow empty, partial decimals, leading minus
        if (v === '' || v === '-' || /^-?\d*\.?\d*$/.test(v)) {
          setText(v);
          const n = parseFloat(v);
          if (isNaN(n)) onChange(0);
          else if (min !== undefined && n < min) onChange(min);
          else if (max !== undefined && n > max) onChange(max);
          else onChange(n);
        }
      }}
      onFocus={e => { try { e.currentTarget.select(); } catch {} }}
    />
  );
}
