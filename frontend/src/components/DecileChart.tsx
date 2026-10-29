import React from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DecileRow } from '@/types';

interface Props {
  deciles: DecileRow[];
}

export default function DecileChart({ deciles }: Props) {
  const data = deciles.map((d) => ({
    decile: `D${d.decile}`,
    predicted: +(d.avg_predicted_pd * 100).toFixed(2),
    actual: +(d.actual_default_rate * 100).toFixed(2),
    capture: +d.cumulative_bad_capture_pct.toFixed(1),
    ks: +d.ks_at_decile.toFixed(1),
  }));

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">10-Decile Risk Capture &amp; Calibration</h2>
          <p className="text-[11px] text-ink-400">Actual default rate vs predicted PD · cumulative bad capture %</p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2740" vertical={false} />
            <XAxis dataKey="decile" stroke="#525f85" tick={{ fill: '#9aa6c4', fontSize: 10 }} />
            <YAxis stroke="#525f85" tick={{ fill: '#7b88a8', fontSize: 10 }} label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#525f85', fontSize: 10 }} />
            <YAxis orientation="right" stroke="#525f85" tick={{ fill: '#7b88a8', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#0b0f1a', border: '1px solid #1f2740', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#c4cce6' }}
            />
            <Legend wrapperStyle={{ color: '#9aa6c4', fontSize: 11 }} />
            <Bar dataKey="predicted" fill="#38bdf8" name="Predicted PD %" radius={[3, 3, 0, 0]} />
            <Bar dataKey="actual" fill="#34d399" name="Actual Default %" radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="capture" stroke="#fbbf24" name="Cumulative Bad Capture %" dot={false} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}