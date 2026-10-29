import json
import os
import joblib
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import StackingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score, brier_score_loss, precision_score, recall_score, f1_score
from lightgbm import LGBMClassifier
import xgboost as xgb
from xgboost import XGBClassifier
from catboost import CatBoostClassifier

def compute_ks(y_true, y_prob):
    pos = y_prob[y_true == 1]
    neg = y_prob[y_true == 0]
    return float(ks_2samp(pos, neg).statistic)

def build_decile_table(y_true, y_prob):
    df_dec = pd.DataFrame({"y_true": y_true, "y_prob": y_prob})
    df_dec["decile"] = pd.qcut(df_dec["y_prob"], 10, labels=False, duplicates="drop")
    df_dec["decile"] = 10 - df_dec["decile"]  # Decile 1 = Highest Risk
    
    total_bads = df_dec["y_true"].sum()
    total_goods = (1 - df_dec["y_true"]).sum()
    overall_bad_rate = df_dec["y_true"].mean()
    
    table = []
    cum_bads = 0
    cum_goods = 0
    for dec in sorted(df_dec["decile"].unique()):
        sub = df_dec[df_dec["decile"] == dec]
        bads = int(sub["y_true"].sum())
        goods = int(len(sub) - bads)
        cum_bads += bads
        cum_goods += goods
        cum_bad_pct = cum_bads / max(total_bads, 1)
        cum_good_pct = cum_goods / max(total_goods, 1)
        ks_val = abs(cum_bad_pct - cum_good_pct)
        actual_rate = float(sub["y_true"].mean())
        table.append({
            "decile": int(dec),
            "count": int(len(sub)),
            "min_pd": round(float(sub["y_prob"].min()), 4),
            "max_pd": round(float(sub["y_prob"].max()), 4),
            "avg_predicted_pd": round(float(sub["y_prob"].mean()), 4),
            "actual_default_rate": round(actual_rate, 4),
            "lift": round(actual_rate / max(overall_bad_rate, 1e-6), 2),
            "cumulative_bad_capture_pct": round(cum_bad_pct * 100, 2),
            "ks_at_decile": round(ks_val * 100, 2)
        })
    return table

def main():
    print("Loading data/processed_loans.parquet...")
    df = pd.read_parquet("data/processed_loans.parquet")
    target_col = "loan_status"
    
    drop_cols = [c for c in ["loan_status", "target_default"] if c in df.columns]
    X = df.drop(columns=drop_cols)
    y = df[target_col].astype(int).values

    cat_cols = X.select_dtypes(include=["category", "object", "string"]).columns.tolist()
    num_cols = [c for c in X.columns if c not in cat_cols]

    encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    X_encoded = X.copy()
    if cat_cols:
        X_encoded[cat_cols] = encoder.fit_transform(X[cat_cols].astype(str)).astype("float32")
    
    feature_names = X_encoded.columns.tolist()
    X_train, X_test, y_train, y_test = train_test_split(
        X_encoded, y, test_size=0.20, stratify=y, random_state=42
    )

    # Monotonic constraints for LightGBM (+1 increases risk, -1 decreases risk)
    mono_map = {
        "person_income": -1,
        "loan_to_income_ratio": 1,
        "loan_percent_income": 1,
        "foir_ratio": 1,
        "loan_int_rate": 1,
        "high_risk_flag": 1
    }
    mono_constraints = [mono_map.get(col, 0) for col in feature_names]

    print("Training 5 BFSI Models on CPU (n_jobs=6)...")
    lr_model = Pipeline([
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42))
    ])

    lgbm_model = LGBMClassifier(
        n_estimators=450, learning_rate=0.04, num_leaves=31, max_depth=6,
        max_bin=255, monotone_constraints=mono_constraints,
        class_weight="balanced", n_jobs=6, random_state=42, verbose=-1
    )

    xgb_model = XGBClassifier(
        n_estimators=450, learning_rate=0.04, max_depth=6,
        tree_method="hist", eval_metric="logloss", n_jobs=6, random_state=42
    )

    cat_model = CatBoostClassifier(
        iterations=550, learning_rate=0.04, depth=6,
        thread_count=6, random_seed=42, verbose=0
    )

    stacking_base = StackingClassifier(
        estimators=[
            ("lgbm", lgbm_model),
            ("xgb", xgb_model),
            ("catboost", cat_model)
        ],
        final_estimator=LogisticRegression(),
        cv=5, n_jobs=1
    )
    champion_ensemble = CalibratedClassifierCV(stacking_base, method="isotonic", cv=3)

    models = {
        "Logistic_Regression_Scorecard": lr_model,
        "LightGBM_Monotonic": lgbm_model,
        "XGBoost_Hist": xgb_model,
        "CatBoost_Ordered": cat_model,
        "Champion_Stacked_Ensemble": champion_ensemble
    }

    leaderboard = {}
    for name, mdl in models.items():
        print(f" -> Fitting {name}...")
        mdl.fit(X_train, y_train)
        probs = mdl.predict_proba(X_test)[:, 1]
        preds = (probs >= 0.35).astype(int)
        auc = float(roc_auc_score(y_test, probs))
        leaderboard[name] = {
            "ROC_AUC": round(auc, 4),
            "Gini_Coefficient": round(2 * auc - 1, 4),
            "KS_Statistic": round(compute_ks(y_test, probs), 4),
            "Brier_Score": round(float(brier_score_loss(y_test, probs)), 4),
            "Precision": round(float(precision_score(y_test, preds, zero_division=0)), 4),
            "Recall": round(float(recall_score(y_test, preds, zero_division=0)), 4),
            "F1_Score": round(float(f1_score(y_test, preds, zero_division=0)), 4)
        }

    # Build 10-decile calibration table on Champion model
    champ_probs = champion_ensemble.predict_proba(X_test)[:, 1]
    decile_table = build_decile_table(y_test, champ_probs)

    # Compute Global SHAP on 1,000 test rows.
    # NOTE: shap.TreeExplainer loads a compiled C extension (shap._cext) which is
    # blocked on this machine by an Application Control policy. XGBoost's own C++
    # tree SHAP (pred_contribs=True) is the exact same algorithm and needs no
    # third-party compiled extension, so we call it directly on the booster.
    print("Computing SHAP TreeExplainer values on 1,000 test samples...")
    sample_X = X_test.iloc[:1000]
    booster = xgb_model.get_booster()
    shap_vals = booster.predict(
        xgb.DMatrix(sample_X), pred_contribs=True
    )
    # XGBoost returns shape (n_samples, n_features + 1); last column is bias.
    shap_vals = shap_vals[:, :-1]
    mean_abs_shap = np.abs(shap_vals).mean(axis=0)
    global_shap = [
        {"feature": feat, "importance": round(float(val), 4)}
        for feat, val in sorted(zip(feature_names, mean_abs_shap), key=lambda x: x[1], reverse=True)
    ]

    os.makedirs("models", exist_ok=True)
    joblib.dump({
        "champion": champion_ensemble,
        "lgbm": lgbm_model,
        "xgb": xgb_model,
        "catboost": cat_model,
        "lr": lr_model,
        "encoder": encoder,
        "cat_cols": cat_cols,
        "num_cols": num_cols,
        "feature_names": feature_names,
        "categorical_options": {c: sorted(X[c].astype(str).unique().tolist()) for c in cat_cols}
    }, "models/credit_risk_bundle.joblib")

    with open("models/model_comparison.json", "w") as f:
        json.dump(leaderboard, f, indent=2)
    with open("models/decile_table.json", "w") as f:
        json.dump(decile_table, f, indent=2)
    with open("models/global_shap.json", "w") as f:
        json.dump(global_shap, f, indent=2)

    print("\n================ 5-MODEL BFSI LEADERBOARD ================")
    print(pd.DataFrame(leaderboard).T.to_string())
    print("\n======== CHAMPION 10-DECILE RISK CAPTURE TABLE ========")
    print(pd.DataFrame(decile_table)[["decile", "min_pd", "max_pd", "avg_predicted_pd", "actual_default_rate", "lift", "cumulative_bad_capture_pct", "ks_at_decile"]].to_string(index=False))
    print("\nSUCCESS: All models and JSON metrics saved to /models!")

if __name__ == "__main__":
    main()
