import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { ShapExplanation } from '@/types';

interface Props {
  shap: ShapExplanation[];
  title?: string;
}

export default function ShapChart({ shap, title = 'Local SHAP Adverse Action & Risk Drivers' }: Props) {
  const data = shap.map((s) => ({
    feature: s.feature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    impact: s.shap_impact,
    direction: s.direction,
    raw: s.raw_value,
  }));

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">{title}</h2>
          <p className="text-[11px] text-ink-400">
            Red = increases risk · Green = decreases risk · magnitude = SHAP impact
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent-rose" /> INCREASES_RISK</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent-emerald" /> DECREASES_RISK</span>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2740" horizontal={false} />
            <XAxis type="number" stroke="#525f85" tick={{ fill: '#7b88a8', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
            <YAxis type="category" dataKey="feature" stroke="#525f85" tick={{ fill: '#9aa6c4', fontSize: 10 }} width={150} />
            <Tooltip
              contentStyle={{ background: '#0b0f1a', border: '1px solid #1f2740', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#c4cce6' }}
              formatter={(v: number, _n: string, p: any) => [
                `${Number(v).toFixed(3)} (${p?.payload?.direction})`,
                p?.payload?.feature,
              ]}
            />
            <Bar dataKey="impact" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.direction === 'INCREASES_RISK' ? '#fb7185' : '#34d399'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}