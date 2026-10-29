import numpy as np

def pd_to_credit_score(pd_val: float, base_score: int = 600, base_odds: float = 19.0, pdo: float = 50.0) -> int:
    """Convert calibrated Probability of Default (PD) into a 300-900 Credit Score using PDO scaling."""
    pd_clamped = float(np.clip(pd_val, 1e-5, 1.0 - 1e-5))
    odds = (1.0 - pd_clamped) / pd_clamped
    factor = pdo / np.log(2.0)
    offset = base_score - factor * np.log(base_odds)
    score = offset + factor * np.log(odds)
    return int(np.clip(np.round(score), 300, 900))

def assign_risk_tier(pd_val: float) -> dict:
    """Assign BFSI Risk Grade and Underwriting Decision."""
    if pd_val < 0.05:
        return {"tier": "Tier A (Prime)", "grade": "A", "decision": "AUTO_APPROVE", "spread_bps": 150}
    elif pd_val < 0.12:
        return {"tier": "Tier B (Near-Prime)", "grade": "B", "decision": "AUTO_APPROVE", "spread_bps": 325}
    elif pd_val < 0.25:
        return {"tier": "Tier C (Subprime)", "grade": "C", "decision": "MANUAL_REVIEW", "spread_bps": 600}
    else:
        return {"tier": "Tier D (High Risk)", "grade": "D", "decision": "REJECT", "spread_bps": 1000}

def calculate_expected_loss_and_pricing(pd_val: float, loan_amnt: float, home_ownership: str, base_rate: float = 8.5) -> dict:
    """Compute Expected Loss (EL = PD * LGD * EAD) and Risk-Based Pricing APR."""
    lgd = 0.25 if str(home_ownership).upper() in ["MORTGAGE", "OWN"] else 0.45
    ead = float(loan_amnt)
    expected_loss = float(pd_val) * lgd * ead
    tier_info = assign_risk_tier(pd_val)
    risk_premium_pct = (float(pd_val) * lgd * 100.0) + (tier_info["spread_bps"] / 100.0)
    recommended_apr = round(base_rate + risk_premium_pct, 2)
    return {
        "pd": round(float(pd_val), 4),
        "credit_score": pd_to_credit_score(pd_val),
        "lgd": lgd,
        "ead": round(ead, 2),
        "expected_loss": round(expected_loss, 2),
        "recommended_apr": recommended_apr,
        **tier_info
    }
