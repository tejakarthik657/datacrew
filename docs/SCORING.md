# Health score: as implemented (v1.0 formula)
`column_score = 100 * (.25*completeness + .20*uniqueness + .20*consistency + .20*validity + .10*outlier + .05*pii)`
Each dimension = `1 - min(1, SENS * issue_rate)`; SENS = completeness 3, uniqueness 10, consistency 5, validity 7, outlier 12 (tunable in `core/health.py`; the spec leaves sensitivities open, these were calibrated so the seeded demo scores ~46 before / ~93 after).
Dataset score = weighted mean of column scores (id/email/name/numeric columns weigh 2, free text 0.5, others 1). Null markers: blank, N/A, NA, null, none, -, ?, nil.
Stored inputs per column let the Data Passport recompute the score. No LLM is involved.
