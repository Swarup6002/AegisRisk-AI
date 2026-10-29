import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ComposedChart, Line, Legend
} from 'recharts';

const API_BASE = 'http://127.0.0.1:8000';

interface LoanForm {
  person_age: number;
  person_income: number;
  person_home_ownership: string;
  person_emp_length: number;
  loan_intent: string;
  loan_grade: string;
  loan_amnt: number;
  loan_int_rate: number;
  loan_percent_income: number;
  cb_person_default_on_file: string;
  cb_person_cred_hist_length: number;
  tenure_months: number;
}

// Added actual Exchange Rates relative to 1 USD
const CURRENCIES = [
  { code: 'USD', label: 'USD ($) - US Dollar', rate: 1.0 },
  { code: 'AED', label: 'AED (د.إ) - UAE Dirham', rate: 3.67 },
  { code: 'SAR', label: 'SAR (ر.س) - Saudi Riyal', rate: 3.75 },
  { code: 'QAR', label: 'QAR (ر.ق) - Qatari Riyal', rate: 3.64 },
  { code: 'KWD', label: 'KWD (د.ك) - Kuwaiti Dinar', rate: 0.31 },
  { code: 'OMR', label: 'OMR (ر.ع.) - Omani Rial', rate: 0.38 },
  { code: 'BHD', label: 'BHD (.د.ب) - Bahraini Dinar', rate: 0.38 },
  { code: 'INR', label: 'INR (₹) - Indian Rupee', rate: 84.0 },
  { code: 'PKR', label: 'PKR (Rs) - Pakistani Rupee', rate: 278.0 },
  { code: 'BDT', label: 'BDT (৳) - Bangladeshi Taka', rate: 110.0 },
  { code: 'LKR', label: 'LKR (Rs) - Sri Lankan Rupee', rate: 300.0 },
  { code: 'NPR', label: 'NPR (Rs) - Nepalese Rupee', rate: 133.0 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'underwrite' | 'governance' | 'stress'>('underwrite');
  const [activeCurrency, setActiveCurrency] = useState<string>('USD');
  const [personas, setPersonas] = useState<any[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string>('prime');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<LoanForm>({
    person_age: 34,
    person_income: 115000,
    person_home_ownership: 'MORTGAGE',
    person_emp_length: 9,
    loan_intent: 'HOMEIMPROVEMENT',
    loan_grade: 'A',
    loan_amnt: 12000,
    loan_int_rate: 7.9,
    loan_percent_income: 0.10,
    cb_person_default_on_file: 'N',
    cb_person_cred_hist_length: 11,
    tenure_months: 36,
  });

  const [prediction, setPrediction] = useState<any>(null);
  const [governance, setGovernance] = useState<any>(null);
  const [rateShock, setRateShock] = useState<number>(2.5);
  const [incomeShock, setIncomeShock] = useState<number>(15);
  const [stressResults, setStressResults] = useState<any[]>([]);

  const currentRate = CURRENCIES.find(c => c.code === activeCurrency)?.rate || 1.0;

  // Format the true local value
  const formatLocalCurrency = (val: number, maxFraction: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: activeCurrency,
      maximumFractionDigits: maxFraction,
    }).format(val);
  };

  // Convert USD memo text into true mathematically converted local values
  const formatMemo = (memo: string) => {
    return memo.replace(/\$([0-9,.]+)/g, (match, p1) => {
      const usdVal = Number(p1.replace(/,/g, ''));
      return formatLocalCurrency(usdVal * currentRate, 2);
    });
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/personas`)
      .then((res) => res.json())
      .then((data) => {
        setPersonas(data);
        if (data.length > 0) {
          handleSelectPersona(data[0], 1.0);
        }
      })
      .catch(() => {
        runPrediction(form, 1.0);
      });

    fetch(`${API_BASE}/api/leaderboard`)
      .then((res) => res.json())
      .then((data) => setGovernance(data))
      .catch((err) => console.error('Governance load error:', err));
  }, []);

  const runPrediction = async (payload: LoanForm, rateOverride?: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const rate = rateOverride || currentRate;
      
      // Convert inputs BACK to USD before sending to the AI model
      const usdIncome = payload.person_income / rate;
      const usdLoan = payload.loan_amnt / rate;

      const updatedPayload = {
        ...payload,
        person_income: usdIncome,
        loan_amnt: usdLoan,
        loan_percent_income: Number((usdLoan / Math.max(usdIncome, 1000)).toFixed(4)),
      };
      
      const res = await fetch(`${API_BASE}/api/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setPrediction(data);
    } catch (e: any) {
      setErrorMsg('Cannot reach FastAPI backend at http://127.0.0.1:8000. Make sure uvicorn is running!');
    } finally {
      setLoading(false);
    }
  };

  // Physically convert values when changing currency in the dropdown
  const handleCurrencyChange = (newCode: string) => {
    const oldRate = currentRate;
    const newRate = CURRENCIES.find(c => c.code === newCode)?.rate || 1.0;
    const conversion = newRate / oldRate;

    setActiveCurrency(newCode);

    const updatedForm = {
      ...form,
      person_income: Math.round(form.person_income * conversion),
      loan_amnt: Math.round(form.loan_amnt * conversion)
    };
    
    setForm(updatedForm);
    runPrediction(updatedForm, newRate);
  };

  const handleSelectPersona = (p: any, forcedRate?: number) => {
    setActivePersonaId(p.id);
    const rate = forcedRate || currentRate;
    
    // Scale persona's default USD values to the selected local currency
    const localForm = {
      ...p.data,
      person_income: Math.round(p.data.person_income * rate),
      loan_amnt: Math.round(p.data.loan_amnt * rate)
    };
    setForm(localForm);
    runPrediction(localForm, rate);
  };

  const handleFieldChange = (field: keyof LoanForm, value: string | number) => {
    const next = { ...form, [field]: value };
    setForm(next);
    runPrediction(next);
  };

  const runStressSimulation = async () => {
    if (!personas.length) return;
    const rows = [];
    for (const p of personas) {
      const baseRes = await fetch(`${API_BASE}/api/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p.data), // Personas data is natively USD
      }).then((r) => r.json());

      const stressedPayload = {
        ...p.data,
        person_income: Math.round(p.data.person_income * (1 - incomeShock / 100)),
        loan_int_rate: Number((p.data.loan_int_rate + rateShock).toFixed(2)),
      };
      const stressRes = await fetch(`${API_BASE}/api/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stressedPayload),
      }).then((r) => r.json());

      rows.push({
        name: p.name,
        basePD: Number((baseRes.probability_of_default * 100).toFixed(2)),
        stressedPD: Number((stressRes.probability_of_default * 100).toFixed(2)),
        baseEL: baseRes.expected_loss, // Stored in USD
        stressedEL: stressRes.expected_loss,
        baseDecision: baseRes.decision,
        stressedDecision: stressRes.decision,
        baseScore: baseRes.credit_score,
        stressedScore: stressRes.credit_score,
      });
    }
    setStressResults(rows);
  };

  useEffect(() => {
    if (activeTab === 'stress' && personas.length > 0) {
      runStressSimulation();
    }
  }, [activeTab, rateShock, incomeShock, personas]);

  const consensusData = prediction?.model_consensus
    ? [
        { model: 'Champion Stacked', pd: Number((prediction.model_consensus.Champion_Stacked_Ensemble_PD * 100).toFixed(2)) },
        { model: 'CatBoost Ordered', pd: Number((prediction.model_consensus.CatBoost_Ordered_PD * 100).toFixed(2)) },
        { model: 'LightGBM Monotonic', pd: Number((prediction.model_consensus.LightGBM_Monotonic_PD * 100).toFixed(2)) },
        { model: 'XGBoost Hist', pd: Number((prediction.model_consensus.XGBoost_Hist_PD * 100).toFixed(2)) },
        { model: 'Logistic Scorecard', pd: Number((prediction.model_consensus.Logistic_Scorecard_PD * 100).toFixed(2)) },
      ]
    : [];

  const leaderboardArray = governance?.leaderboard
    ? Object.entries(governance.leaderboard).map(([name, m]: [string, any]) => ({
        name: name.replace(/_/g, ' '),
        ROC_AUC: m.ROC_AUC,
        Gini: m.Gini_Coefficient,
        KS: m.KS_Statistic,
        Brier: m.Brier_Score,
        F1: m.F1_Score,
      }))
    : [];

  const decisionBadgeColor = (dec?: string) => {
    if (dec === 'AUTO_APPROVE') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
    if (dec === 'MANUAL_REVIEW') return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center font-extrabold text-slate-950 text-lg shadow-lg shadow-indigo-500/20">
              AR
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                AegisRisk AI
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden md:block">
                  Basel III • Monotonic Stacking Ensemble
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Institutional Credit Risk Underwriting & Global Decision Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={activeCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 hidden lg:flex">
              <button onClick={() => setActiveTab('underwrite')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'underwrite' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>1. Live Underwriting</button>
              <button onClick={() => setActiveTab('governance')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'governance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>2. Model Governance</button>
              <button onClick={() => setActiveTab('stress')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'stress' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>3. Macro Stress Test</button>
            </div>
          </div>
        </div>
      </header>

      {errorMsg && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="bg-rose-950/70 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl text-sm">
            ⚠️ {errorMsg}
          </div>
        </div>
      )}

      {activeTab === 'underwrite' && (
        <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full space-y-6">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Quick-Load Applicant Personas
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {personas.map((p) => (
                <button key={p.id} onClick={() => handleSelectPersona(p)} className={`text-left p-3.5 rounded-xl border transition ${activePersonaId === p.id ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}>
                  <div className="font-semibold text-sm text-white">{p.name}</div>
                  <div className="text-xs text-indigo-300 mt-1">{p.badge}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#111827] border border-indigo-500/30 rounded-2xl p-5 shadow-lg">
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-300 mb-1">What-If Loan Restructuring Simulator</h2>
                <div className="space-y-4 mt-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Requested Loan Principal</span>
                      <span className="font-bold text-indigo-300">{formatLocalCurrency(form.loan_amnt)}</span>
                    </div>
                    <input type="range" min={Math.round(1000 * currentRate)} max={Math.round(500000 * currentRate)} step={Math.round(1000 * currentRate)} value={form.loan_amnt} onChange={(e) => handleFieldChange('loan_amnt', Number(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Proposed Interest Rate APR (%)</span>
                      <span className="font-bold text-indigo-300">{form.loan_int_rate}%</span>
                    </div>
                    <input type="range" min={5.0} max={35.0} step={0.25} value={form.loan_int_rate} onChange={(e) => handleFieldChange('loan_int_rate', Number(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Repayment Tenure (Months)</span>
                      <span className="font-bold text-indigo-300">{form.tenure_months} mos</span>
                    </div>
                    <input type="range" min={12} max={120} step={6} value={form.tenure_months} onChange={(e) => handleFieldChange('tenure_months', Number(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Applicant Financial & Bureau Inputs</h2>
                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Annual Income</label>
                    <input type="number" value={form.person_income} onChange={(e) => handleFieldChange('person_income', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Applicant Age</label>
                    <input type="number" value={form.person_age} onChange={(e) => handleFieldChange('person_age', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Home Ownership</label>
                    <select value={form.person_home_ownership} onChange={(e) => handleFieldChange('person_home_ownership', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                      <option value="MORTGAGE">MORTGAGE</option>
                      <option value="OWN">OWN</option>
                      <option value="RENT">RENT</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Employment Length (Yrs)</label>
                    <input type="number" step="0.5" value={form.person_emp_length} onChange={(e) => handleFieldChange('person_emp_length', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Loan Purpose</label>
                    <select value={form.loan_intent} onChange={(e) => handleFieldChange('loan_intent', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                      <option value="DEBTCONSOLIDATION">DEBTCONSOLIDATION</option>
                      <option value="PERSONAL">PERSONAL</option>
                      <option value="HOMEIMPROVEMENT">HOMEIMPROVEMENT</option>
                      <option value="MEDICAL">MEDICAL</option>
                      <option value="EDUCATION">EDUCATION</option>
                      <option value="VENTURE">VENTURE</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Bureau Credit Grade</label>
                    <select value={form.loan_grade} onChange={(e) => handleFieldChange('loan_grade', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Prior Bureau Default?</label>
                    <select value={form.cb_person_default_on_file} onChange={(e) => handleFieldChange('cb_person_default_on_file', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                      <option value="N">No (Clean Record)</option>
                      <option value="Y">Yes (Prior Default)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Credit History (Yrs)</label>
                    <input type="number" value={form.cb_person_cred_hist_length} onChange={(e) => handleFieldChange('cb_person_cred_hist_length', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              {prediction && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                      <div className="text-xs text-slate-400">PDO Credit Risk Score</div>
                      <div className="text-3xl font-extrabold text-white mt-1">{prediction.credit_score}<span className="text-xs font-normal text-slate-400"> / 900</span></div>
                      <div className="text-xs text-indigo-400 mt-1">{prediction.risk_tier}</div>
                    </div>
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                      <div className="text-xs text-slate-400">Calibrated Default Prob (PD)</div>
                      <div className="text-3xl font-extrabold text-cyan-400 mt-1">{(prediction.probability_of_default * 100).toFixed(2)}%</div>
                      <div className="text-xs text-slate-400 mt-1">LGD: {(prediction.lgd * 100).toFixed(0)}% • EAD: {formatLocalCurrency(prediction.ead * currentRate)}</div>
                    </div>
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                      <div className="text-xs text-slate-400">Underwriting Decision</div>
                      <div className="mt-2"><span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${decisionBadgeColor(prediction.decision)}`}>{prediction.decision}</span></div>
                      <div className="text-xs text-slate-400 mt-2">Expected Loss: <strong className="text-rose-400">{formatLocalCurrency(prediction.expected_loss * currentRate, 2)}</strong></div>
                    </div>
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                      <div className="text-xs text-slate-400">Risk-Based Pricing APR</div>
                      <div className="text-2xl font-bold text-emerald-400 mt-1">{prediction.recommended_apr}% APR</div>
                      <div className="text-xs text-slate-400 mt-1">Spread: +{prediction.spread_bps} bps</div>
                    </div>
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                      <div className="text-xs text-slate-400">Estimated Monthly EMI</div>
                      <div className="text-2xl font-bold text-white mt-1">{formatLocalCurrency(prediction.monthly_emi * currentRate, 2)}</div>
                      <div className="text-xs text-slate-400 mt-1">FOIR: {prediction.foir_pct}% of Monthly Inc</div>
                    </div>
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                      <div className="text-xs text-slate-400">Loan-to-Income (LTI)</div>
                      <div className="text-2xl font-bold text-white mt-1">{prediction.lti_pct}%</div>
                      <div className="text-xs text-slate-400 mt-1">Grade {prediction.grade} Risk Bucket</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/40 rounded-2xl p-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1.5">Automated Credit Committee Underwriting Memo</div>
                    <p className="text-sm text-slate-200 leading-relaxed">{formatMemo(prediction.underwriting_memo)}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Local TreeSHAP Adverse Action Drivers</h3>
                      <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={prediction.shap_explanations} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                            <YAxis dataKey="feature" type="category" stroke="#cbd5e1" fontSize={10} width={110} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                            <Bar dataKey="shap_impact" radius={[4, 4, 4, 4]}>
                              {prediction.shap_explanations.map((entry: any, idx: number) => (
                                <Cell key={idx} fill={entry.shap_impact > 0 ? '#f43f5e' : '#10b981'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">5-Model Ensemble Consensus (PD %)</h3>
                      <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={consensusData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={11} unit="%" />
                            <YAxis dataKey="model" type="category" stroke="#cbd5e1" fontSize={10} width={115} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                            <Bar dataKey="pd" fill="#6366f1" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      )}

      {activeTab === 'governance' && governance && (
        <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full space-y-6">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-1">Champion vs. Challenger Model Governance Benchmark</h2>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase">
                    <th className="py-3 px-4">Model Architecture</th>
                    <th className="py-3 px-4">ROC-AUC</th>
                    <th className="py-3 px-4">Gini Coefficient</th>
                    <th className="py-3 px-4">KS-Statistic</th>
                    <th className="py-3 px-4">Brier Score</th>
                    <th className="py-3 px-4">F1-Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardArray.map((row) => (
                    <tr key={row.name} className={`border-b border-slate-800/60 ${row.name.includes('Champion') ? 'bg-indigo-950/40 font-semibold text-white' : 'text-slate-300'}`}>
                      <td className="py-3 px-4">{row.name}</td>
                      <td className="py-3 px-4 text-cyan-400">{row.ROC_AUC}</td>
                      <td className="py-3 px-4 text-indigo-300">{row.Gini}</td>
                      <td className="py-3 px-4 text-emerald-400">{row.KS}</td>
                      <td className="py-3 px-4">{row.Brier}</td>
                      <td className="py-3 px-4">{row.F1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-1">10-Decile Bad Capture & KS Separation Curve</h3>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={governance.decile_table}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="decile" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                    <Legend />
                    <Bar dataKey="cumulative_bad_capture_pct" name="Cum. Bad Capture (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="ks_at_decile" name="KS Spread (%)" stroke="#10b981" strokeWidth={2.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-1">Global TreeSHAP Feature Importance</h3>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={governance.global_shap.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 45, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                    <YAxis dataKey="feature" type="category" stroke="#cbd5e1" fontSize={10} width={120} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                    <Bar dataKey="importance" fill="#06b6d4" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </main>
      )}

      {activeTab === 'stress' && (
        <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full space-y-6">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-1">Macroeconomic Scenario & Portfolio Stress Simulator (CCAR / Basel III)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-4 bg-slate-900/70 p-4 rounded-xl border border-slate-800">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Interest Rate Shock (+APR %)</span>
                  <span className="text-rose-400 font-bold">+{rateShock}%</span>
                </div>
                <input type="range" min={0} max={6} step={0.5} value={rateShock} onChange={(e) => setRateShock(Number(e.target.value))} className="w-full accent-rose-500 cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Household Income Shock (-%)</span>
                  <span className="text-rose-400 font-bold">-{incomeShock}%</span>
                </div>
                <input type="range" min={0} max={35} step={5} value={incomeShock} onChange={(e) => setIncomeShock(Number(e.target.value))} className="w-full accent-rose-500 cursor-pointer" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase">
                    <th className="py-3 px-4">Borrower Segment</th>
                    <th className="py-3 px-4">Baseline PD</th>
                    <th className="py-3 px-4">Stressed PD</th>
                    <th className="py-3 px-4">Baseline Expected Loss</th>
                    <th className="py-3 px-4">Stressed Expected Loss</th>
                    <th className="py-3 px-4">Decision Migration</th>
                  </tr>
                </thead>
                <tbody>
                  {stressResults.map((r) => (
                    <tr key={r.name} className="border-b border-slate-800/60 text-slate-200">
                      <td className="py-3.5 px-4 font-semibold">{r.name}</td>
                      <td className="py-3.5 px-4 text-emerald-400">{r.basePD}%</td>
                      <td className="py-3.5 px-4 text-rose-400 font-bold">{r.stressedPD}%</td>
                      <td className="py-3.5 px-4">{formatLocalCurrency(r.baseEL * currentRate)}</td>
                      <td className="py-3.5 px-4 text-rose-400 font-bold">{formatLocalCurrency(r.stressedEL * currentRate)}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-400">{r.baseDecision}</span>
                        <span className="mx-2 text-slate-500">→</span>
                        <span className={`px-2 py-0.5 rounded border font-semibold ${decisionBadgeColor(r.stressedDecision)}`}>{r.stressedDecision}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}