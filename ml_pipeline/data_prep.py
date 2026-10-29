import pandas as pd
import numpy as np
from pathlib import Path

def main():
    # Load raw data
    df = pd.read_csv('data/raw_loans.csv')

    print(f"Initial dataset shape: {df.shape}")
    print(f"Initial memory usage: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")

    # === Data Cleaning ===

    # 1. Remove extreme outliers
    # Remove person_age > 90
    original_rows = len(df)
    df = df[df['person_age'] <= 90]
    print(f"Removed {original_rows - len(df)} rows with person_age > 90")

    # Remove person_emp_length > 60
    df = df[df['person_emp_length'] <= 60]
    print(f"Remaining rows after emp_length filter: {len(df)}")

    # 2. Impute missing values
    # Impute missing loan_int_rate by median per loan_grade
    loan_int_rate_missing_before = df['loan_int_rate'].isna().sum()
    loan_int_rate_median_by_grade = df.groupby('loan_grade')['loan_int_rate'].transform('median')
    df['loan_int_rate'] = df['loan_int_rate'].fillna(loan_int_rate_median_by_grade)
    print(f"Imputed {loan_int_rate_missing_before} missing loan_int_rate values (median per loan_grade)")

    # Impute missing person_emp_length by median
    person_emp_length_missing_before = df['person_emp_length'].isna().sum()
    person_emp_length_median = df['person_emp_length'].median()
    df['person_emp_length'] = df['person_emp_length'].fillna(person_emp_length_median)
    print(f"Imputed {person_emp_length_missing_before} missing person_emp_length values (median={person_emp_length_median})")

    # === Feature Engineering ===

    # 3. loan_to_income_ratio (loan_amnt / person_income)
    df['loan_to_income_ratio'] = df['loan_amnt'] / df['person_income']

    # 4. estimated_monthly_emi (amortization formula, 36-month tenure)
    # EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    # where P = loan_amnt, r = monthly_interest_rate, n = 36 months
    monthly_rate = df['loan_int_rate'] / 100 / 12  # Convert percentage to decimal monthly rate
    df['estimated_monthly_emi'] = (
        df['loan_amnt'] * monthly_rate * (1 + monthly_rate)**36 /
        ((1 + monthly_rate)**36 - 1)
    )

    # 5. foir_ratio (Fixed Obligation to Income Ratio)
    # foir_ratio = estimated_monthly_emi / (person_income / 12)
    df['foir_ratio'] = df['estimated_monthly_emi'] / (df['person_income'] / 12)

    # 6. income_per_emp_year (person_income / (person_emp_length + 1))
    df['income_per_emp_year'] = df['person_income'] / (df['person_emp_length'] + 1)

    # 7. credit_history_to_age_ratio (cb_person_cred_hist_length / person_age)
    df['credit_history_to_age_ratio'] = df['cb_person_cred_hist_length'] / df['person_age']

    # 8. high_risk_flag
    df['high_risk_flag'] = (
        (df['loan_grade'].isin(['D', 'E', 'F', 'G'])) &
        (df['cb_person_default_on_file'] == 'Y')
    ).astype(int)

    # === Downcast and Clean ===

    # Original numeric columns that need downcasting
    original_numeric_cols = [
        'person_age', 'person_income', 'person_emp_length',
        'loan_amnt', 'loan_int_rate', 'loan_percent_income',
        'cb_person_cred_hist_length', 'loan_to_income_ratio',
        'estimated_monthly_emi', 'foir_ratio',
        'income_per_emp_year', 'credit_history_to_age_ratio',
        'high_risk_flag'
    ]

    # Downcast to float32 where appropriate
    for col in original_numeric_cols:
        if col in df.columns:
            if col not in ['loan_status', 'high_risk_flag']:
                # Try float32 for floating point columns
                if df[col].dtype in ['float64', 'float32']:
                    df[col] = df[col].astype('float32')
                # Keep int32 for integer columns
                elif df[col].dtype in ['int64', 'int32']:
                    df[col] = df[col].astype('int32')
            else:
                # Keep loan_status and high_risk_flag as int8 to save space
                df[col] = df[col].astype('int8')

    # === Target preparation ===
    # Create target variable if not present (loan_status is already the target)
    if 'target_default' not in df.columns:
        df['target_default'] = df['loan_status'].astype('int8')

    # === Memory optimization ===

    # Calculate memory usage after downcasting
    final_memory = df.memory_usage(deep=True).sum() / 1024**2
    print(f"Final memory usage: {final_memory:.2f} MB")
    print(f"Final dataset shape: {df.shape}")

    # Print feature statistics
    print("\n=== Feature Statistics ===")
    print(f"Target default rate: {df['target_default'].mean():.4f} ({df['target_default'].sum()}/{len(df)})")

    print("\n=== Memory usage by column ===")
    mem_usage = df.memory_usage(deep=True)
    for col, mem in mem_usage.items():
        if col not in df.columns:
            continue  # Skip index memory entry
        print(f"{col:30s}: {mem / 1024:8.1f} KB ({df[col].dtype})")

    # === Save processed data ===

    # Ensure data directory exists
    Path('data').mkdir(parents=True, exist_ok=True)

    # Save to parquet
    output_path = 'data/processed_loans.parquet'
    df.to_parquet(output_path, index=False)
    print(f"\nSaved processed data to: {output_path}")

    print(f"\n=== Final Summary ===")
    print(f"Rows processed: {original_rows} -> {len(df)}")
    print(f"Final dataset shape: {df.shape}")
    print(f"Final memory usage: {final_memory:.2f} MB")
    print(f"Target default rate: {df['target_default'].mean():.4f}")

    return df

if __name__ == "__main__":
    df = main()