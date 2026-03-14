#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:-$(find src-tauri/target/release/bundle/macos -maxdepth 1 -type d -name '*.app' | head -n 1)}"
OUTPUT_PATH="${2:-}"
VOLUME_NAME="${DMG_VOLUME_NAME:-ChronoMap}"

if [[ -z "$APP_PATH" || ! -d "$APP_PATH" ]]; then
  echo "Missing app bundle for DMG packaging: $APP_PATH"
  exit 1
fi

if [[ -z "$OUTPUT_PATH" ]]; then
  VERSION=$(node -e 'const fs=require("fs"); const cfg=JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json","utf8")); console.log(cfg.version || "0.0.0");')
  ARCH=$(uname -m)
  mkdir -p src-tauri/target/release/bundle/dmg
  OUTPUT_PATH="src-tauri/target/release/bundle/dmg/ChronoMap_${VERSION}_${ARCH}.dmg"
fi

STAGING_DIR=$(mktemp -d /tmp/chronomap-dmg-stage.XXXXXX)
trap 'rm -rf "$STAGING_DIR"' EXIT

cp -R "$APP_PATH" "$STAGING_DIR/"
ln -s /Applications "$STAGING_DIR/Applications"

hdiutil create -volname "$VOLUME_NAME" -srcfolder "$STAGING_DIR" -ov -format UDZO "$OUTPUT_PATH"

echo "Created DMG: $OUTPUT_PATH"
