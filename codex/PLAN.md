# Delta Plan (Phase 2)

## A) Executive Summary

### Current state (repo-grounded)
- Desktop app built with Tauri 2 + React 19 + Rust + SQLite; README claims local-first timeline + AI assistant. (`README.md`)
- Frontend is TypeScript strict mode with Vitest tests and Zustand stores. (`package.json`, `src/stores/*`)
- App shell composes major layout regions and mounts timeline/theme loaders via `useEffect`. (`src/components/layout/AppShell.tsx`)
- Existing AppShell test validates high-level rendering only, but baseline test run emits multiple React `act(...)` warnings tied to this test path. (`src/components/layout/AppShell.test.tsx`)
- Frontend typecheck and test suite are green in this environment. (`codex/VERIFICATION.md`)
- Rust tests cannot run in this container due to missing `glib-2.0` system pkg-config metadata. (`codex/VERIFICATION.md`)

### Key risks
- Noisy test warnings can hide real regressions and reduce confidence.
- AppShell test currently exercises many nested async effects indirectly, making it brittle.
- No CI workflow present in-repo, so local test signal quality matters even more.

### Improvement themes (prioritized)
1. Stabilize AppShell test behavior by isolating layout contract from nested async side effects.
2. Improve verification signal (clean run without avoidable warnings).
3. Leave auditable run artifacts for interruption/resume (`codex/*`).

## B) Constraints & Invariants (Repo-derived)
- Invariant: do not change user-facing AppShell behavior/layout contract.
- Invariant: keep changes small and localized (test-first quality improvement).
- Inference: stores and commands are integration points; unit/component tests should mock boundaries for deterministic behavior.
- Non-goals: no schema changes, no command/API contract changes, no Tauri backend refactor.

## C) Proposed Changes by Theme (Prioritized)

### Theme 1: AppShell test stabilization
- Current approach: `AppShell.test.tsx` renders full shell with live nested components and mocked invoke.
- Proposed: mock child layout panels and store hooks in test to validate AppShell composition contract deterministically.
- Why: removes unrelated async state updates causing `act(...)` warnings.
- Tradeoff: slightly less integration realism in this one test.
- Alternative rejected: refactor runtime AppShell effects (too broad for observed issue).
- Scope boundary: only test code in `src/components/layout/AppShell.test.tsx`.
- Migration: replace existing test with deterministic mocks and assertions.

## D) File/Module Delta (Exact)
- ADD:
  - `codex/SESSION_LOG.md` (run log)
  - `codex/PLAN.md` (delta plan)
  - `codex/DECISIONS.md` (judgment log)
  - `codex/CHECKPOINTS.md` (checkpoint trail)
  - `codex/VERIFICATION.md` (verification evidence)
  - `codex/CHANGELOG_DRAFT.md` (delivery changelog draft)
- MODIFY:
  - `src/components/layout/AppShell.test.tsx` (stabilize test/mocks)
- REMOVE/DEPRECATE: none.
- Boundary rules: no production behavior changes; tests may mock store/component boundaries only.

## E) Data Models & API Contracts (Delta)
- Current: no contract changes required.
- Proposed: none.
- Compatibility: fully backward compatible.
- Migrations: none.
- Versioning: none.

## F) Implementation Sequence (Dependency-Explicit)
1. **Objective:** rewrite AppShell test to isolate async side effects.
   - Files: `src/components/layout/AppShell.test.tsx`
   - Preconditions: baseline tests green.
   - Dependencies: vitest mocking utilities.
   - Verify after step: `pnpm test -- src/components/layout/AppShell.test.tsx`
   - Rollback: restore previous test file content.

2. **Objective:** run broader frontend verification.
   - Files: none (verification only)
   - Verify: `pnpm test` and `pnpm exec tsc --noEmit`
   - Rollback: if regression introduced, revert test changes and re-run.

3. **Objective:** finalize delivery docs and checkpoints.
   - Files: `codex/*`
   - Verify: `git diff --stat` sanity + rerun targeted test if docs touch none.
   - Rollback: remove/adjust docs if inconsistent.

## G) Error Handling & Edge Cases
- Current pattern: AppShell mount effects trigger async loads; tests can see post-render updates.
- Improvement: test isolates composition contract and verifies expected loader calls/branch rendering deterministically.
- Edge cases to cover:
  - no active timeline => welcome screen branch.
  - mount triggers timeline/theme load calls.

## H) Integration & Testing Strategy
- Unit/component focus: AppShell test only.
- Regression check: full frontend suite + typecheck.
- Definition of Done:
  - AppShell test passes without previous warning pattern.
  - Frontend suite remains green.
  - Audit artifacts complete.

## I) Assumptions & Judgment Calls
- Assumption: React warning noise originates from asynchronous nested component effects in current broad render test.
- Judgment call: prefer boundary-mocked component test over runtime refactor to keep risk low and reversible.
