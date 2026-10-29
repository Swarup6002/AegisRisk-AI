import React from 'react';
import { ShieldCheck, Activity, Scale, GitBranch } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-ink-700/70 bg-ink-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-accent-emerald/30 to-accent-sky/20 border border-accent-emerald/40 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-accent-emerald" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-ink-50 leading-none">
                AegisRisk AI
              </h1>
              <p className="text-[11px] text-ink-300 leading-none mt-0.5">
                Institutional Credit Underwriting & Model Governance
              </p>
            </div>
          </div>

          <nav className="ml-8 flex items-center gap-1">
            <Tab icon={GitBranch} label="Live Underwriting Desk" />
            <Tab icon={Scale} label="Champion vs. Challenger Governance" />
            <Tab icon={Activity} label="Portfolio Stress Testing" />
          </nav>

          <div className="ml-auto flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5 text-ink-300">
              <span className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse" />
              API Live
            </div>
            <div className="text-ink-400 font-mono">v1.0.0</div>
            <div className="text-ink-400 font-mono">PDO 50 · Base 600</div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6">
        {children}
      </main>

      <footer className="border-t border-ink-700/70 bg-ink-900/60">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between text-[11px] text-ink-400">
          <span>© 2026 AegisRisk AI · Monotonic Stacking Ensemble + Scorecard</span>
          <span>PD = Calibrated ensemble · EL = PD × LGD × EAD · LGD 0.45 unsecured / 0.25 secured</span>
        </div>
      </footer>
    </div>
  );
}

function Tab({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button className="tab-btn flex items-center gap-1.5">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}