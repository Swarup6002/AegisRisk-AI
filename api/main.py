import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Credit Risk Decisioning API")

# Define the expected input payload based on your features
class LoanApplication(BaseModel):
    person_age: int
    person_income: int
    person_home_ownership: str
    person_emp_length: float
    loan_intent: str
    loan_grade: str
    loan_amnt: int
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str
    cb_person_cred_hist_length: int

# Load artifacts on startup
artifacts = {}

@app.on_event("startup")
def load_model():
    try:
        # Construct the exact path to the models folder dynamically
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, "models", "credit_risk_bundle.joblib")
        
        artifacts["bundle"] = joblib.load(model_path)
        print(f"Model loaded successfully from: {model_path}")
    except Exception as e:
        print(f"Error loading model: {e}")

@app.post("/predict")
def predict_risk(application: LoanApplication):
    if "bundle" not in artifacts:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Convert payload to DataFrame (using model_dump for Pydantic v2)
    df = pd.DataFrame([application.model_dump()])
    
    # Get the champion model from your bundle
    model = artifacts["bundle"]["models"]["Champion_Stacked_Ensemble"]
    
    # Predict probability of default (PD)
    pd_score = model.predict_proba(df)[0][1]
    
    # Business logic: map probability to a risk tier
    if pd_score < 0.10:
        tier = "Low Risk (Auto-Approve)"
    elif pd_score < 0.40:
        tier = "Medium Risk (Manual Review)"
    else:
        tier = "High Risk (Auto-Reject)"

    return {
        "probability_of_default": round(float(pd_score), 4),
        "risk_tier": tier,
        "decision_status": "success"
    }