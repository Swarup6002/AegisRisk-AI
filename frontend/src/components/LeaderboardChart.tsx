import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { LeaderboardEntry } from '@/types';

const MODELS = [
  'Logistic_Regression_Scorecard',
  'LightGBM_Monotonic',
  'XGBoost_Hist',
  'CatBoost_Ordered',
  'Champion_Stacked_Ensemble',
] as const;

const METRICS = [
  { key: 'ROC_AUC', label: 'ROC AUC', color: '#34d399' },
  { key: 'Gini_Coefficient', label: 'Gini', color: '#38bdf8' },
  { key: 'KS_Statistic', label: 'KS', color: '#818cf8' },
  { key: 'Brier_Score', label: 'Brier', color: '#fbbf24' },
  { key: 'F1_Score', label: 'F1', color: '#fb7185' },
];

interface Props {
  leaderboard: Record<string, LeaderboardEntry>;
}

export default function LeaderboardChart({ leaderboard }: Props) {
  const data = MODELS.map((name) => {
    const row = leaderboard[name];
    const obj: Record<string, any> = { model: name.replace(/_/g, ' ') };
    METRICS.forEach((m) => { obj[m.label] = row ? (row[m.key] as number) : 0; });
    return obj;
  });

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">Grouped Metric Comparison</h2>
          <p className="text-[11px] text-ink-400">All 5 models across ROC-AUC, Gini, KS, Brier, F1</p>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2740" vertical={false} />
            <XAxis dataKey="model" stroke="#525f85" tick={{ fill: '#9aa6c4', fontSize: 10 }} />
            <YAxis stroke="#525f85" tick={{ fill: '#7b88a8', fontSize: 10 }} domain={[0, 1]} />
            <Tooltip
              contentStyle={{ background: '#0b0f1a', border: '1px solid #1f2740', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#c4cce6' }}
            />
            <Legend wrapperStyle={{ color: '#9aa6c4', fontSize: 11 }} />
            {METRICS.map((m) => (
              <Bar key={m.key} dataKey={m.label} fill={m.color} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}