# Waiver Model

Waivers are stored in `.codex/waivers.json`.

## Required Fields

- `waiver_id`
- `gate_id`
- `owner`
- `approver`
- `reason`
- `expires_at` (ISO timestamp)

## Rules

- One waiver per gate condition.
- Waivers expire automatically.
- Waivers longer than 72 hours require explicit PM approval.
- Default authority owner for waiver approvals: `PM Approver` role in `docs/release/owner-map.md`.
