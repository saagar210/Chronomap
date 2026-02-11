# Decisions

## 2026-02-10
- Decision: prioritize a small, reversible testing-quality improvement instead of broad refactor.
- Rationale: repository is already feature-rich; baseline issue observed is noisy `act(...)` warnings in AppShell test, which reduces signal quality.
- Alternatives considered:
  - Broad AppShell refactor to remove async mount effects (rejected: larger risk, unclear product need).
  - Ignore warnings (rejected: allows test quality debt to persist).
- Decision: mock AppShell child components and stores in `AppShell.test.tsx` to enforce a deterministic layout contract test.
- Rationale: this removes unrelated async updates that triggered warning noise while preserving core assertion intent.
- Tradeoff: less integration coverage in this one test; compensated by retaining full suite pass and other component/store tests.
