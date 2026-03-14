# Chronomap Completion Contract

This document is the single source of truth for production-completion blocking rules.

## Gate Policy

- Any required gate with status `fail` blocks completion.
- Any required gate with status `not-run` blocks completion.
- `waived` is allowed only with a valid, unexpired waiver record.

## Canonical Artifacts

- Gate report: `.codex/reports/gate-report.json`
- Gate logs: `.codex/reports/logs/*.log`
- Perf summary: `.perf-results/summary.json`
- Release metadata: `release/release-metadata.json`
- AI eval report: `release/ai-eval-report.json`

## Phase Exits

1. Scope Freeze

- Core scope locked and tracked in this contract.

2. RC Ready

- `pnpm verify` passes with no blocking gates.
- RC artifact built for macOS (`pnpm release:rc:dry-run` pre-credential, signed/notarized RC after credential handoff).

3. Launch Ready

- Signed and notarized metadata confirms `signed=true` and `notarized=true`.
- Rollback workflow dry-run passes.

4. Hypercare Exit

- Hypercare thresholds are met for the full window.

5. Closeout Done

- Closeout packet published with residual risk ownership.

## Waiver Rules

- Waivers must include owner, approver, reason, and expiry.
- Default maximum waiver duration is 72 hours.
- Expired waivers are invalid and block completion.
