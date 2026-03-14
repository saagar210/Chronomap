# Pre-Credential Release Checklist

Use this checklist before Apple notarization credentials are finalized.

## 1) RC dry run (unsigned path)

- Run: `pnpm release:rc:dry-run`
- Expected:
  - App bundle and DMG are produced.
  - `.release/signing-status.json` is `not-run` or `pass`.
  - `.release/notarization-status.json` is `not-run` or `pass`.
  - `release/release-metadata.json` is generated.

## 2) Verify contract

- Run: `pnpm verify`
- Expected: `.codex/reports/gate-report.json` overall status `pass`.

## 3) Rollback drill

- Run: `bash scripts/release/rollback_channel.sh <target-version>`
- Expected: `release/channels/stable.json` updates correctly.

## 4) Hypercare criteria lock

- Confirm thresholds in `docs/release/hypercare-playbook.md`.

## 5) Credential handoff prep

- Ensure these are set in CI secrets:
  - `APPLE_CERTIFICATE_BASE64`
  - `APPLE_CERTIFICATE_PASSWORD`
  - `APPLE_SIGNING_IDENTITY`
  - `APPLE_ID`
  - `APPLE_TEAM_ID`
- Remaining final blocker: `APPLE_ID_PASSWORD`.
