import React from 'react';
import type { LoanApp } from '@/types';

interface Props {
  app: LoanApp;
  onChange: (next: LoanApp) => void;
}

export default function CounterfactualSliders({ app, onChange }: Props) {
  const set = <K extends keyof LoanApp>(key: K, value: LoanApp[K]) =>
    onChange({ ...app, [key]: value });

  return (
    <div className="card p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">What-If Counterfactual Restructuring</h2>
          <p className="text-[11px] text-ink-400">Slide to restructure the deal · live re-evaluation against the champion ensemble</p>
        </div>
        <span className="text-[10px] font-mono text-ink-400 uppercase tracking-wider">Counterfactual</span>
      </div>

      <div className="space-y-5">
        <Slider
          label="Loan Amount"
          value={app.loan_amnt}
          min={1000} max={50000} step={500}
          fmt={(v) => `$${v.toLocaleString()}`}
          onChange={(v) => set('loan_amnt', v)}
        />
        <Slider
          label="Interest Rate"
          value={app.loan_int_rate}
          min={5} max={24} step={0.1}
          fmt={(v) => `${v.toFixed(1)}%`}
          onChange={(v) => set('loan_int_rate', v)}
        />
        <Slider
          label="Tenure"
          value={app.tenure_months}
          min={12} max={84} step={1}
          fmt={(v) => `${v} mo`}
          onChange={(v) => set('tenure_months', v)}
        />
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, fmt, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  fmt: (v: number) => string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-ink-200">{label}</span>
        <span className="text-sm font-mono font-semibold text-accent-sky">{fmt(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent-sky cursor-pointer"
        style={{
          WebkitAppearance: 'none', appearance: 'none', height: '6px',
          background: `linear-gradient(90deg, #38bdf8 ${pct}%, #1f2740 ${pct}%)`,
          borderRadius: '9999px',
        }}
      />
      <div className="flex justify-between text-[9px] font-mono text-ink-500 mt-1">
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
    </div>
  );
}