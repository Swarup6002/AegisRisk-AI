import React from 'react';
import type { ModelConsensus } from '@/types';

const MODELS: { key: keyof ModelConsensus; label: string; color: string }[] = [
  { key: 'Champion_Stacked_Ensemble_PD', label: 'Champion Ensemble', color: '#34d399' },
  { key: 'CatBoost_Ordered_PD', label: 'CatBoost Ordered', color: '#38bdf8' },
  { key: 'LightGBM_Monotonic_PD', label: 'LightGBM Monotonic', color: '#818cf8' },
  { key: 'XGBoost_Hist_PD', label: 'XGBoost Hist', color: '#fbbf24' },
  { key: 'Logistic_Scorecard_PD', label: 'Logistic Scorecard', color: '#9aa6c4' },
];

interface Props {
  consensus: ModelConsensus;
  championPd: number;
}

export default function ConsensusBar({ consensus, championPd }: Props) {
  const max = Math.max(...MODELS.map((m) => consensus[m.key] as number), 0.0001);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">5-Model Consensus Comparison</h2>
          <p className="text-[11px] text-ink-400">Champion ensemble PD vs each base model &amp; scorecard challenger</p>
        </div>
        <span className="text-[10px] font-mono text-ink-400 uppercase tracking-wider">PD</span>
      </div>

      <div className="space-y-2.5">
        {MODELS.map((m) => {
          const val = consensus[m.key] as number;
          const pct = (val / max) * 100;
          const isChampion = m.key === 'Champion_Stacked_Ensemble_PD';
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-medium ${isChampion ? 'text-accent-emerald' : 'text-ink-200'}`}>
                  {isChampion && '★ '}{m.label}
                </span>
                <span className="font-mono text-ink-100">{(val * 100).toFixed(2)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-ink-950/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: m.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}