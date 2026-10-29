import json
import os
import traceback
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from ml_pipeline.scorecard_utils import calculate_expected_loss_and_pricing

app = FastAPI(
    title="AegisRisk AI — Institutional BFSI Credit Risk API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUNDLE_PATH = os.path.join(BASE_DIR, "models", "credit_risk_bundle.joblib")
MODELS_DIR = os.path.join(BASE_DIR, "models")

bundle = joblib.load(BUNDLE_PATH) if os.path.exists(BUNDLE_PATH) else None

class LoanApplication(BaseModel):
    person_age: int = Field(default=29)
    person_income: float = Field(default=75000.0)
    person_home_ownership: str = Field(default="RENT")
    person_emp_length: float = Field(default=5.0)
    loan_intent: str = Field(default="PERSONAL")
    loan_grade: str = Field(default="B")
    loan_amnt: float = Field(default=12000.0)
    loan_int_rate: float = Field(default=10.99)
    loan_percent_income: float = Field(default=0.16)
    cb_person_default_on_file: str = Field(default="N")
    cb_person_cred_hist_length: int = Field(default=6)
    tenure_months: int = Field(default=36)

def engineer_single_applicant(app_data: LoanApplication) -> pd.DataFrame:
    safe_income = max(float(app_data.person_income), 1000.0)
    safe_age = max(int(app_data.person_age), 18)
    safe_emp = max(float(app_data.person_emp_length), 0.0)
    safe_rate = max(float(app_data.loan_int_rate), 0.1)
    safe_tenure = max(int(app_data.tenure_months), 6)
    loan_amnt = max(float(app_data.loan_amnt), 100.0)

    r = (safe_rate / 100.0) / 12.0
    n = safe_tenure
    emi = loan_amnt * (r * ((1.0 + r) ** n)) / max(((1.0 + r) ** n) - 1.0, 1e-6)
    monthly_income = safe_income / 12.0

    lti = round(loan_amnt / safe_income, 4)
    foir = round(emi / monthly_income, 4)
    inc_per_emp = round(safe_income / (safe_emp + 1.0), 2)
    cred_to_age = round(float(app_data.cb_person_cred_hist_length) / safe_age, 4)

    grade_clean = str(app_data.loan_grade).upper().strip()
    if grade_clean not in ["A", "B", "C", "D", "E", "F", "G"]:
        grade_clean = "C"
    default_clean = "Y" if str(app_data.cb_person_default_on_file).upper().strip() == "Y" else "N"
    home_clean = str(app_data.person_home_ownership).upper().strip()
    if home_clean not in ["RENT", "MORTGAGE", "OWN", "OTHER"]:
        home_clean = "RENT"
    intent_clean = str(app_data.loan_intent).upper().strip()
    if intent_clean not in ["PERSONAL", "EDUCATION", "MEDICAL", "VENTURE", "HOMEIMPROVEMENT", "DEBTCONSOLIDATION"]:
        intent_clean = "PERSONAL"

    high_risk = 1 if (grade_clean in ["D", "E", "F", "G"] and default_clean == "Y") else 0

    return pd.DataFrame([{
        "person_age": safe_age,
        "person_income": safe_income,
        "person_home_ownership": home_clean,
        "person_emp_length": safe_emp,
        "loan_intent": intent_clean,
        "loan_grade": grade_clean,
        "loan_amnt": loan_amnt,
        "loan_int_rate": safe_rate,
        "loan_percent_income": lti,
        "cb_person_default_on_file": default_clean,
        "cb_person_cred_hist_length": int(app_data.cb_person_cred_hist_length),
        "loan_to_income_ratio": lti,
        "estimated_monthly_emi": round(emi, 2),
        "foir_ratio": foir,
        "income_per_emp_year": inc_per_emp,
        "credit_history_to_age_ratio": cred_to_age,
        "high_risk_flag": high_risk
    }])

def evaluate_borrower(app_data: LoanApplication) -> dict:
    global bundle
    if bundle is None:
        bundle = joblib.load(BUNDLE_PATH)

    df_raw = engineer_single_applicant(app_data)
    feature_names = bundle["feature_names"]
    cat_cols = bundle["cat_cols"]
    encoder = bundle["encoder"]

    X_row = pd.DataFrame(index=[0])
    for col in feature_names:
        X_row[col] = df_raw[col].values[0] if col in df_raw.columns else 0.0

    X_encoded = X_row.copy()
    if cat_cols:
        X_encoded[cat_cols] = encoder.transform(X_row[cat_cols].astype(str)).astype("float32")
    for col in X_encoded.columns:
        X_encoded[col] = pd.to_numeric(X_encoded[col], errors="coerce").fillna(0.0).astype("float32")

    pd_champ = float(bundle["champion"].predict_proba(X_encoded)[0, 1])
    pd_lgbm = float(bundle["lgbm"].predict_proba(X_encoded)[0, 1])
    pd_xgb = float(bundle["xgb"].predict_proba(X_encoded)[0, 1])
    pd_cat = float(bundle["catboost"].predict_proba(X_encoded)[0, 1])
    pd_lr = float(bundle["lr"].predict_proba(X_encoded)[0, 1])

    pricing = calculate_expected_loss_and_pricing(
        pd_val=pd_champ,
        loan_amnt=float(df_raw["loan_amnt"].iloc[0]),
        home_ownership=str(df_raw["person_home_ownership"].iloc[0])
    )

    shap_contribs = bundle["lgbm"].predict(X_encoded, pred_contrib=True)[0][:-1]
    shap_items = []
    for feat, val in zip(feature_names, shap_contribs):
        shap_items.append({
            "feature": feat,
            "raw_value": str(X_row[feat].iloc[0]),
            "shap_impact": round(float(val), 4),
            "direction": "INCREASES_RISK" if val > 0 else "DECREASES_RISK"
        })
    shap_items_sorted = sorted(shap_items, key=lambda x: abs(x["shap_impact"]), reverse=True)[:8]

    top_risk = [s["feature"] for s in shap_items_sorted if s["shap_impact"] > 0][:2]
    top_strength = [s["feature"] for s in shap_items_sorted if s["shap_impact"] < 0][:2]
    memo = (
        f"CREDIT COMMITTEE ASSESSMENT ({pricing['decision']}): Applicant scores {pricing['credit_score']}/900 "
        f"({pricing['tier']}) with a calibrated Probability of Default of {round(pd_champ*100, 2)}% and Expected Loss "
        f"of ${pricing['expected_loss']:,.2f}. Key strengths mitigating risk: {', '.join(top_strength) or 'None'}. "
        f"Primary risk drivers: {', '.join(top_risk) or 'Low overall risk profile'}. "
        f"Recommended pricing: {pricing['recommended_apr']}% APR (Monthly EMI: ${float(df_raw['estimated_monthly_emi'].iloc[0]):,.2f}, "
        f"FOIR: {round(float(df_raw['foir_ratio'].iloc[0])*100, 1)}%)."
    )

    return {
        **pricing,
        "probability_of_default": round(pd_champ, 4),
        "risk_tier": pricing["tier"],
        "monthly_emi": float(df_raw["estimated_monthly_emi"].iloc[0]),
        "foir_pct": round(float(df_raw["foir_ratio"].iloc[0]) * 100, 2),
        "lti_pct": round(float(df_raw["loan_to_income_ratio"].iloc[0]) * 100, 2),
        "model_consensus": {
            "Champion_Stacked_Ensemble_PD": round(pd_champ, 4),
            "CatBoost_Ordered_PD": round(pd_cat, 4),
            "LightGBM_Monotonic_PD": round(pd_lgbm, 4),
            "XGBoost_Hist_PD": round(pd_xgb, 4),
            "Logistic_Scorecard_PD": round(pd_lr, 4)
        },
        "shap_explanations": shap_items_sorted,
        "underwriting_memo": memo
    }

@app.post("/predict")
@app.post("/api/predict-risk")
def predict_risk(application: LoanApplication):
    try:
        return evaluate_borrower(application)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": traceback.format_exc()})

@app.get("/api/leaderboard")
def get_leaderboard():
    with open(os.path.join(MODELS_DIR, "model_comparison.json")) as f1, \
         open(os.path.join(MODELS_DIR, "decile_table.json")) as f2, \
         open(os.path.join(MODELS_DIR, "global_shap.json")) as f3:
        return {
            "leaderboard": json.load(f1),
            "decile_table": json.load(f2),
            "global_shap": json.load(f3)
        }

@app.get("/api/personas")
def get_personas():
    return [
        {
            "id": "prime",
            "name": "1. Prime Salaried Homeowner",
            "badge": "Low Risk • Grade A",
            "data": {"person_age": 34, "person_income": 115000, "person_home_ownership": "MORTGAGE", "person_emp_length": 9, "loan_intent": "HOMEIMPROVEMENT", "loan_grade": "A", "loan_amnt": 12000, "loan_int_rate": 7.9, "loan_percent_income": 0.10, "cb_person_default_on_file": "N", "cb_person_cred_hist_length": 11, "tenure_months": 36}
        },
        {
            "id": "near_prime",
            "name": "2. Near-Prime Debt Consolidation",
            "badge": "Moderate Risk • Grade B",
            "data": {"person_age": 28, "person_income": 68000, "person_home_ownership": "RENT", "person_emp_length": 4, "loan_intent": "DEBTCONSOLIDATION", "loan_grade": "B", "loan_amnt": 14000, "loan_int_rate": 11.4, "loan_percent_income": 0.21, "cb_person_default_on_file": "N", "cb_person_cred_hist_length": 6, "tenure_months": 36}
        },
        {
            "id": "subprime",
            "name": "3. High-FOIR Medical Borrower",
            "badge": "Borderline • Grade C",
            "data": {"person_age": 24, "person_income": 42000, "person_home_ownership": "RENT", "person_emp_length": 2, "loan_intent": "MEDICAL", "loan_grade": "C", "loan_amnt": 15000, "loan_int_rate": 14.8, "loan_percent_income": 0.36, "cb_person_default_on_file": "N", "cb_person_cred_hist_length": 3, "tenure_months": 36}
        },
        {
            "id": "high_risk",
            "name": "4. Over-Leveraged Prior Defaulter",
            "badge": "High Default Risk • Grade E",
            "data": {"person_age": 23, "person_income": 31000, "person_home_ownership": "RENT", "person_emp_length": 0.5, "loan_intent": "PERSONAL", "loan_grade": "E", "loan_amnt": 16000, "loan_int_rate": 18.5, "loan_percent_income": 0.52, "cb_person_default_on_file": "Y", "cb_person_cred_hist_length": 2, "tenure_months": 36}
        }
    ]
