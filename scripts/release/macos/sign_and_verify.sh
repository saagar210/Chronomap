#!/usr/bin/env bash
set -euo pipefail

mkdir -p .release

ALLOW_UNSIGNED_RELEASE="${ALLOW_UNSIGNED_RELEASE:-false}"
CERT_B64="${APPLE_CERTIFICATE_BASE64:-}"
CERT_PASSWORD="${APPLE_CERTIFICATE_PASSWORD:-}"
SIGNING_IDENTITY="${APPLE_SIGNING_IDENTITY:-}"

if [[ -z "$CERT_B64" || -z "$CERT_PASSWORD" || -z "$SIGNING_IDENTITY" ]]; then
  if [[ "$ALLOW_UNSIGNED_RELEASE" == "true" ]]; then
    cat > .release/signing-status.json <<JSON
{
  "status": "not-run",
  "signed": false,
  "reason": "Signing credentials not provided",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON
    echo "Signing skipped because credentials are not available."
    exit 0
  fi
  echo "Missing signing credentials and ALLOW_UNSIGNED_RELEASE is false."
  exit 1
fi

CERT_PATH="/tmp/chronomap_signing_cert.p12"
KEYCHAIN_PATH="/tmp/chronomap-signing.keychain-db"
KEYCHAIN_PASSWORD="${KEYCHAIN_PASSWORD:-chronomap-ci-keychain}"

printf '%s' "$CERT_B64" | base64 --decode > "$CERT_PATH"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security import "$CERT_PATH" -k "$KEYCHAIN_PATH" -P "$CERT_PASSWORD" -T /usr/bin/codesign
security list-keychains -d user -s "$KEYCHAIN_PATH"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

APP_PATH=$(find src-tauri/target/release/bundle -type d -name "*.app" | head -n 1)
if [[ -z "$APP_PATH" ]]; then
  echo "No .app bundle found for signing."
  exit 1
fi

codesign --force --deep --options runtime --sign "$SIGNING_IDENTITY" "$APP_PATH"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

cat > .release/signing-status.json <<JSON
{
  "status": "pass",
  "signed": true,
  "app_path": "$APP_PATH",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON
