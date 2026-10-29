import React from 'react';

export type TabId = 'underwriting' | 'governance' | 'stress';

interface TabsProps {
  active: TabId;
  onChange: (t: TabId) => void;
}

export default function Tabs({ active, onChange }: TabsProps) {
  const items: { id: TabId; label: string }[] = [
    { id: 'underwriting', label: 'Live Underwriting Desk' },
    { id: 'governance', label: 'Champion vs. Challenger Governance' },
    { id: 'stress', label: 'Portfolio Stress Testing' },
  ];
  return (
    <div className="border-b border-ink-700/70 mb-6 flex gap-1">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`tab-btn ${active === it.id ? 'tab-btn-active' : ''}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}