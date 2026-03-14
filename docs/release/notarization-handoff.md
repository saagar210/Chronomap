# Notarization Handoff

When `APPLE_ID_PASSWORD` is available, run:

1. `pnpm release:check-secrets` (in CI environment)
2. Trigger `.github/workflows/release-macos-rc.yml` with:
   - `version`
   - `allow_unsigned_release=false`
3. Validate outputs:
   - `.release/signing-status.json` -> `signed: true`
   - `.release/notarization-status.json` -> `notarized: true`
   - `release/release-metadata.json` -> `signed: true`, `notarized: true`
4. Trigger promotion workflow once go/no-go is approved.
