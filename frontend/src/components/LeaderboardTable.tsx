import React from 'react';
import type { LeaderboardEntry } from '@/types';

const MODELS = [
  'Logistic_Regression_Scorecard',
  'LightGBM_Monotonic',
  'XGBoost_Hist',
  'CatBoost_Ordered',
  'Champion_Stacked_Ensemble',
] as const;

const METRICS: { key: keyof LeaderboardEntry; label: string; fmt: (v: number) => string; lowerBetter?: boolean }[] = [
  { key: 'ROC_AUC', label: 'ROC AUC', fmt: (v) => v.toFixed(4) },
  { key: 'Gini_Coefficient', label: 'Gini', fmt: (v) => v.toFixed(4) },
  { key: 'KS_Statistic', label: 'KS', fmt: (v) => v.toFixed(4) },
  { key: 'Brier_Score', label: 'Brier', fmt: (v) => v.toFixed(4), lowerBetter: true },
  { key: 'F1_Score', label: 'F1', fmt: (v) => v.toFixed(4) },
];

interface Props {
  leaderboard: Record<string, LeaderboardEntry>;
}

export default function LeaderboardTable({ leaderboard }: Props) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">Model Leaderboard</h2>
          <p className="text-[11px] text-ink-400">Champion vs challenger comparison across hold-out metrics</p>
        </div>
        <span className="text-[10px] font-mono text-ink-400 uppercase tracking-wider">5 Models</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-ink-400 border-b border-ink-700">
              <th className="py-2 pr-4 font-semibold">Model</th>
              {METRICS.map((m) => (
                <th key={m.key} className="py-2 px-3 font-semibold text-center">
                  {m.label}
                  {m.lowerBetter && <span className="text-[9px] text-ink-500"> ↓</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODELS.map((name) => {
              const row = leaderboard[name];
              if (!row) return null;
              const isChampion = name === 'Champion_Stacked_Ensemble';
              return (
                <tr
                  key={name}
                  className={`border-b border-ink-800/60 ${
                    isChampion ? 'bg-accent-emerald/5' : 'hover:bg-ink-850/40'
                  }`}
                >
                  <td className={`py-2 pr-4 font-medium ${isChampion ? 'text-accent-emerald' : 'text-ink-200'}`}>
                    {isChampion && '★ '}{name.replace(/_/g, ' ')}
                  </td>
                  {METRICS.map((m) => {
                    const v = row[m.key] as number;
                    const best = Math.min(...MODELS.map((n) => (leaderboard[n] ? (leaderboard[n][m.key] as number) : Infinity)));
                    const worst = Math.max(...MODELS.map((n) => (leaderboard[n] ? (leaderboard[n][m.key] as number) : -Infinity)));
                    const isBest = m.lowerBetter ? v <= best : v >= worst;
                    return (
                      <td key={m.key} className="px-3 py-2 text-center">
                        <span className={`font-mono ${isBest ? 'text-accent-emerald font-semibold' : 'text-ink-200'}`}>
                          {m.fmt(v)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}