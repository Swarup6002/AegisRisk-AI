import React from 'react';
import type { LoanApp } from '@/types';

interface Props {
  app: LoanApp;
  onChange: (next: LoanApp) => void;
}

export default function LoanForm({ app, onChange }: Props) {
  const set = <K extends keyof LoanApp>(key: K, value: LoanApp[K]) =>
    onChange({ ...app, [key]: value });

  const num = (v: string): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-50">Loan Application Form</h2>
          <p className="text-[11px] text-ink-400">Edit fields to re-evaluate live against the champion ensemble</p>
        </div>
        <span className="text-[10px] font-mono text-ink-400 uppercase tracking-wider">Applicant</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Field label="Age">
          <input className="input" type="number" value={app.person_age}
            onChange={(e) => set('person_age', num(e.target.value))} />
        </Field>
        <Field label="Annual Income ($)">
          <input className="input" type="number" value={app.person_income}
            onChange={(e) => set('person_income', num(e.target.value))} />
        </Field>
        <Field label="Home Ownership">
          <select className="input" value={app.person_home_ownership}
            onChange={(e) => set('person_home_ownership', e.target.value)}>
            <option>MORTGAGE</option>
            <option>OWN</option>
            <option>RENT</option>
          </select>
        </Field>
        <Field label="Emp. Length (yrs)">
          <input className="input" type="number" step="0.5" value={app.person_emp_length}
            onChange={(e) => set('person_emp_length', num(e.target.value))} />
        </Field>
        <Field label="Loan Intent">
          <select className="input" value={app.loan_intent}
            onChange={(e) => set('loan_intent', e.target.value)}>
            <option>DEBTCONSOLIDATION</option>
            <option>EDUCATION</option>
            <option>HOMEIMPROVEMENT</option>
            <option>HOUSE</option>
            <option>MAJORPURCHASE</option>
            <option>MEDICAL</option>
            <option>PERSONAL</option>
            <option>VACATION</option>
          </select>
        </Field>
        <Field label="Loan Grade">
          <select className="input" value={app.loan_grade}
            onChange={(e) => set('loan_grade', e.target.value)}>
            <option>A</option><option>AA</option><option>B</option><option>C</option>
            <option>D</option><option>E</option><option>F</option><option>G</option>
          </select>
        </Field>
        <Field label="Default on File">
          <select className="input" value={app.cb_person_default_on_file}
            onChange={(e) => set('cb_person_default_on_file', e.target.value)}>
            <option>N</option><option>Y</option>
          </select>
        </Field>
        <Field label="Credit Hist Length">
          <input className="input" type="number" value={app.cb_person_cred_hist_length}
            onChange={(e) => set('cb_person_cred_hist_length', num(e.target.value))} />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-ink-300 font-semibold mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}