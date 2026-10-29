import React from 'react';

interface Props {
  score: number;
  min?: number;
  max?: number;
}

export default function ScoreGauge({ score, min = 300, max = 900 }: Props) {
  const pct = Math.max(0, Math.min(1, (score - min) / (max - min)));
  const circ = 2 * Math.PI * 46;
  const dash = circ * (1 - pct);

  let color = '#f43f5e';
  if (score >= 720) color = '#34d399';
  else if (score >= 650) color = '#38bdf8';
  else if (score >= 580) color = '#fbbf24';
  else if (score >= 500) color = '#fb7185';

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg className="h-36 w-36 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#1f2740" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} strokeDashoffset={dash}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-mono text-ink-50" style={{ color }}>{score}</span>
          <span className="text-[10px] uppercase tracking-wider text-ink-400">Credit Score</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-ink-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#34d399' }} />≥720 Prime</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#38bdf8' }} />650–719</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#fbbf24' }} />580–649</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#fb7185' }} />&lt;580</span>
      </div>
    </div>
  );
}