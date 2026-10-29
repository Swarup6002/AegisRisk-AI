import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { Decision } from '@/types';

interface Props {
  decision: Decision;
  grade?: string;
  tier?: string;
}

const config: Record<Decision, { icon: React.ElementType; label: string; ring: string; bg: string; text: string }> = {
  AUTO_APPROVE: { icon: CheckCircle2, label: 'AUTO APPROVE', ring: 'ring-accent-emerald/40', bg: 'bg-accent-emerald/10', text: 'text-accent-emerald' },
  MANUAL_REVIEW: { icon: AlertTriangle, label: 'MANUAL REVIEW', ring: 'ring-accent-amber/40', bg: 'bg-accent-amber/10', text: 'text-accent-amber' },
  REJECT: { icon: XCircle, label: 'REJECT', ring: 'ring-accent-rose/40', bg: 'bg-accent-rose/10', text: 'text-accent-rose' },
};

export default function DecisionBadge({ decision, grade, tier }: Props) {
  const c = config[decision];
  const Icon = c.icon;
  return (
    <div className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-ink-700 ${c.bg} px-4 py-3 ring-1 ${c.ring}`}>
      <Icon className={`h-6 w-6 ${c.text}`} />
      <span className={`text-sm font-bold tracking-wider ${c.text}`}>{c.label}</span>
      {tier && <span className="text-[10px] text-ink-300 font-mono uppercase tracking-wide">{tier}</span>}
      {grade && <span className="text-[10px] text-ink-400 font-mono">Grade {grade}</span>}
    </div>
  );
}