# Project: BFSI Monotonic Stacking Ensemble Credit Risk & Underwriting Platform

## Hardware Rules (Intel i7 CPU, 16GB RAM, No GPU)
- Use n_jobs=6 across LightGBM, XGBoost, and CatBoost (thread_count=6).
- Downcast numeric columns to float32 / int32 and store processed data as data/processed_loans.parquet.
- Keep total memory footprint under 2GB RAM.

## Superior Model Architecture: Monotonic Stacking Ensemble + Scorecard
1. Base Model 1 (CatBoostClassifier): Handles categorical interactions with symmetric trees (depth=6, iterations=600, learning_rate=0.04).
2. Base Model 2 (LGBMClassifier with Monotonic Constraints): Enforce domain monotonicity (monotone_constraints) so higher loan_percent_income (LTI) and prior default strictly increase risk, while higher person_income strictly decreases risk.
3. Base Model 3 (XGBClassifier): Depth-wise gradient boosted trees with tree_method='hist' and L1/L2 regularization.
4. Ensemble Meta-Learner (StackingClassifier + CalibratedClassifierCV): Combine the 3 base models using 5-fold Stratified Cross-Validation into a LogisticRegression meta-learner, followed by Isotonic/Sigmoid Probability Calibration to output true Probability of Default (PD).
5. Challenger Comparison: Compare Logistic Regression Scorecard, LightGBM, XGBoost, and CatBoost against the Stacked Ensemble Champion on ROC-AUC, Gini Coefficient (2*AUC - 1), KS-Statistic, and Brier Score.

## BFSI Financial Risk Calculations
- Probability of Default (PD): Calibrated ensemble output (0 to 1).
- Credit Risk Score (300 - 900): Scaled using PDO (Points to Double the Odds = 50, Base Score = 600 at 1:19 odds).
- Expected Loss (EL): PD * LGD * EAD (where EAD = Loan Amount, LGD = 0.45 for unsecured / 0.25 for home-owner/secured).
- Risk-Based Pricing: Compute break-even interest rate + risk premium based on PD and LGD.
- Explainable AI (SHAP): Compute local SHAP feature attributions to generate Adverse Action Reason Codes for every loan decision.
