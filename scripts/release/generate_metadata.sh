#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-0.1.0}"
CHANNEL="${2:-rc}"
PLATFORM="${3:-macos}"
DMG_PATH="${4:-$(find src-tauri/target/release/bundle/dmg -type f -name '*.dmg' | head -n 1)}"

if [[ -z "$DMG_PATH" || ! -f "$DMG_PATH" ]]; then
  echo "Missing DMG for metadata generation."
  exit 1
fi

SIGNED=$(node -e 'const fs=require("fs"); const p=".release/signing-status.json"; if (!fs.existsSync(p)) {console.log("false"); process.exit(0);} const x=JSON.parse(fs.readFileSync(p,"utf8")); console.log(Boolean(x.signed));')
NOTARIZED=$(node -e 'const fs=require("fs"); const p=".release/notarization-status.json"; if (!fs.existsSync(p)) {console.log("false"); process.exit(0);} const x=JSON.parse(fs.readFileSync(p,"utf8")); console.log(Boolean(x.notarized));')
CHECKSUM=$(shasum -a 256 "$DMG_PATH" | awk '{print $1}')

mkdir -p release
cat > release/release-metadata.json <<JSON
{
  "version": "${VERSION}",
  "channel": "${CHANNEL}",
  "platform": "${PLATFORM}",
  "signed": ${SIGNED},
  "notarized": ${NOTARIZED},
  "checksum": "${CHECKSUM}",
  "provenance_attestation_uri": ""
}
JSON

echo "Wrote release/release-metadata.json"
