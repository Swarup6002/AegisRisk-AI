export interface Persona {
  id: string;
  name: string;
  badge: string;
  data: LoanApp;
}

export interface LoanApp {
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

export interface ShapExplanation {
  feature: string;
  raw_value: string;
  shap_impact: number;
  direction: 'INCREASES_RISK' | 'DECREASES_RISK';
}

export interface ModelConsensus {
  Champion_Stacked_Ensemble_PD: number;
  CatBoost_Ordered_PD: number;
  LightGBM_Monotonic_PD: number;
  XGBoost_Hist_PD: number;
  Logistic_Scorecard_PD: number;
}

export interface PredictResponse {
  pd: number;
  credit_score: number;
  lgd: number;
  ead: number;
  expected_loss: number;
  recommended_apr: number;
  tier: string;
  grade: string;
  decision: 'AUTO_APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
  spread_bps: number;
  monthly_emi: number;
  foir_pct: number;
  lti_pct: number;
  model_consensus: ModelConsensus;
  shap_explanations: ShapExplanation[];
  underwriting_memo: string;
}

export interface LeaderboardEntry {
  ROC_AUC: number;
  Gini_Coefficient: number;
  KS_Statistic: number;
  Brier_Score: number;
  Precision: number;
  Recall: number;
  F1_Score: number;
}

export interface LeaderboardResponse {
  leaderboard: Record<string, LeaderboardEntry>;
  decile_table: DecileRow[];
  global_shap: GlobalShapRow[];
}

export interface DecileRow {
  decile: number;
  count: number;
  min_pd: number;
  max_pd: number;
  avg_predicted_pd: number;
  actual_default_rate: number;
  lift: number;
  cumulative_bad_capture_pct: number;
  ks_at_decile: number;
}

export interface GlobalShapRow {
  feature: string;
  importance: number;
}

export type Decision = 'AUTO_APPROVE' | 'MANUAL_REVIEW' | 'REJECT';