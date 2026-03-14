#!/usr/bin/env bash
set -euo pipefail

mkdir -p .release

ALLOW_UNSIGNED_RELEASE="${ALLOW_UNSIGNED_RELEASE:-false}"
APPLE_ID="${APPLE_ID:-}"
APPLE_ID_PASSWORD="${APPLE_ID_PASSWORD:-}"
APPLE_TEAM_ID="${APPLE_TEAM_ID:-}"

DMG_PATH=$(find src-tauri/target/release/bundle -type f -name "*.dmg" | head -n 1)
if [[ -z "$DMG_PATH" ]]; then
  echo "No DMG found for notarization."
  exit 1
fi

if [[ -z "$APPLE_ID" || -z "$APPLE_ID_PASSWORD" || -z "$APPLE_TEAM_ID" ]]; then
  if [[ "$ALLOW_UNSIGNED_RELEASE" == "true" ]]; then
    cat > .release/notarization-status.json <<JSON
{
  "status": "not-run",
  "notarized": false,
  "reason": "Apple notarization credentials not provided",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON
    echo "Notarization skipped because credentials are not available."
    exit 0
  fi
  echo "Missing notarization credentials and ALLOW_UNSIGNED_RELEASE is false."
  exit 1
fi

xcrun notarytool submit "$DMG_PATH" --apple-id "$APPLE_ID" --password "$APPLE_ID_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait
xcrun stapler staple "$DMG_PATH"
spctl --assess --type open --context context:primary-signature -v "$DMG_PATH"

cat > .release/notarization-status.json <<JSON
{
  "status": "pass",
  "notarized": true,
  "dmg_path": "$DMG_PATH",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON
