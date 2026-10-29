import React from 'react';
import type { PredictResponse } from '@/types';

interface Props {
  memo: string;
  data: PredictResponse;
}

export default function MemoCard({ memo, data }: Props) {
  const lines = memo.split('\n').filter((l) => l.trim());

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">Credit Committee Underwriting Memo</h2>
          <p className="text-[11px] text-ink-400">Generated from calibrated ensemble output &amp; SHAP drivers</p>
        </div>
        <span className="text-[10px] font-mono text-ink-400 uppercase tracking-wider">MEMO</span>
      </div>

      <div className="rounded-lg border border-ink-700 bg-ink-950/40 p-4 text-sm leading-relaxed text-ink-200 font-mono whitespace-pre-wrap">
        {memo}
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="rounded-md bg-ink-950/40 border border-ink-700 p-2">
          <div className="text-ink-400 uppercase tracking-wider">Decision</div>
          <div className="font-mono text-ink-50">{data.decision}</div>
        </div>
        <div className="rounded-md bg-ink-950/40 border border-ink-700 p-2">
          <div className="text-ink-400 uppercase tracking-wider">Score</div>
          <div className="font-mono text-ink-50">{data.credit_score}/900</div>
        </div>
        <div className="rounded-md bg-ink-950/40 border border-ink-700 p-2">
          <div className="text-ink-400 uppercase tracking-wider">PD</div>
          <div className="font-mono text-ink-50">{(data.pd * 100).toFixed(2)}%</div>
        </div>
        <div className="rounded-md bg-ink-950/40 border border-ink-700 p-2">
          <div className="text-ink-400 uppercase tracking-wider">EL</div>
          <div className="font-mono text-ink-50">${data.expected_loss.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}