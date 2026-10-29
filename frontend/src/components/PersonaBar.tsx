import React from 'react';
import type { Persona } from '@/types';

interface Props {
  personas: Persona[];
  activeId: string | null;
  onSelect: (p: Persona) => void;
}

export default function PersonaBar({ personas, activeId, onSelect }: Props) {
  return (
    <div className="card p-3 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">One-Click Persona Profiles</h2>
          <p className="text-[11px] text-ink-400">Pre-loaded applicant scenarios · click to load the loan application form</p>
        </div>
        <span className="text-[10px] font-mono text-ink-400 uppercase tracking-wider">4 Scenarios</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`text-left rounded-lg border p-3 transition-all duration-200 ${
              activeId === p.id
                ? 'border-accent-sky/60 bg-accent-sky/10 shadow-glow'
                : 'border-ink-700 bg-ink-950/40 hover:border-ink-500 hover:bg-ink-850'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-ink-400">#{p.id}</span>
              <span className="text-[10px] font-mono text-ink-300">{p.badge}</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-ink-50 leading-snug">{p.name}</div>
            <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-ink-300">
              <span>Income ${p.data.person_income.toLocaleString()}</span>
              <span>Loan ${p.data.loan_amnt.toLocaleString()}</span>
              <span>LTI {(p.data.loan_percent_income * 100).toFixed(0)}%</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}