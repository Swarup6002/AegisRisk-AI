import React from 'react';
import type { PredictResponse } from '@/types';
import StatPill from '@/components/StatPill';
import DecisionBadge from '@/components/DecisionBadge';
import ScoreGauge from '@/components/ScoreGauge';

interface Props {
  data: PredictResponse;
  loading: boolean;
}

export default function ScorecardRibbon({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 w-40 bg-ink-700 rounded mb-4" />
        <div className="grid grid-cols-2 gap-6">
          <div className="flex justify-center"><div className="h-36 w-36 rounded-full bg-ink-700" /></div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-ink-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">Executive Scorecard Ribbon</h2>
          <p className="text-[11px] text-ink-400">Calibrated PD · 300–900 credit score · PDO 50 / Base 600</p>
        </div>
        <DecisionBadge decision={data.decision} grade={data.grade} tier={data.tier} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="flex justify-center">
          <ScoreGauge score={data.credit_score} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatPill label="Calibrated PD" value={`${(data.pd * 100).toFixed(2)}%`} color="rose" />
          <StatPill label="Expected Loss" value={`$${data.expected_loss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="amber" />
          <StatPill label="Monthly EMI" value={`$${data.monthly_emi.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="sky" />
          <StatPill label="FOIR %" value={`${data.foir_pct.toFixed(1)}%`} color={data.foir_pct > 40 ? 'rose' : 'emerald'} />
          <StatPill label="LTI %" value={`${data.lti_pct.toFixed(1)}%`} color={data.lti_pct > 36 ? 'rose' : 'slate'} />
          <StatPill label="Recommended APR" value={`${data.recommended_apr.toFixed(2)}%`} color="indigo" sub={`spread +${data.spread_bps} bps`} />
        </div>
      </div>
    </div>
  );
}