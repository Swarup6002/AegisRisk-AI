import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { GlobalShapRow } from '@/types';

interface Props {
  shap: GlobalShapRow[];
}

export default function GlobalShapChart({ shap }: Props) {
  const data = shap.map((s) => ({
    feature: s.feature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    importance: s.importance,
  }));

  const max = Math.max(...data.map((d) => d.importance), 0.0001);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">Global SHAP Feature Importance</h2>
          <p className="text-[11px] text-ink-400">Model-level driver attribution across the portfolio</p>
        </div>
      </div>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2740" horizontal={false} />
            <XAxis type="number" stroke="#525f85" tick={{ fill: '#7b88a8', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
            <YAxis type="category" dataKey="feature" stroke="#525f85" tick={{ fill: '#9aa6c4', fontSize: 10 }} width={170} />
            <Tooltip
              contentStyle={{ background: '#0b0f1a', border: '1px solid #1f2740', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#c4cce6' }}
              formatter={(v: number) => [v.toFixed(4), 'Importance']}
            />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={`hsl(${200 - (i / data.length) * 160}, 70%, ${60 - (i / data.length) * 15}%)`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}