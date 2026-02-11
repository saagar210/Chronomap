# Changelog Draft

## Theme: Test stability and verification signal
- Planned: stabilize `AppShell` component test to avoid noisy React `act(...)` warnings by isolating nested async side effects behind explicit mocks.

## Theme: Session audibility and resume safety
- Added `codex/*` artifacts for plan, decisions, verification evidence, and checkpoints.

## Completed
- Reworked `src/components/layout/AppShell.test.tsx` into a deterministic composition test using mocked store hooks and child components.
- Added explicit assertions for loader/clearer calls on initial mount (`loadTimelines`, `loadTheme`, and clear operations for no active timeline).
- Eliminated previously observed React `act(...)` warning noise during frontend test runs.
- Added execution artifacts for auditability and resume safety:
  - `codex/SESSION_LOG.md`
  - `codex/PLAN.md`
  - `codex/DECISIONS.md`
  - `codex/CHECKPOINTS.md`
  - `codex/VERIFICATION.md`
