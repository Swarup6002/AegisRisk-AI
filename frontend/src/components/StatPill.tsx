import React from 'react';

interface Props {
  label: string;
  value: string;
  sub?: string;
  color?: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate' | 'indigo';
  mono?: boolean;
}

const colorMap = {
  emerald: 'text-accent-emerald',
  amber: 'text-accent-amber',
  rose: 'text-accent-rose',
  sky: 'text-accent-sky',
  slate: 'text-ink-200',
  indigo: 'text-accent-indigo',
};

export default function StatPill({ label, value, sub, color = 'slate', mono = true }: Props) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${colorMap[color]} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-ink-400 font-mono">{sub}</span>}
    </div>
  );
}