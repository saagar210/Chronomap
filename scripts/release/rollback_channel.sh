#!/usr/bin/env bash
set -euo pipefail

TARGET_VERSION="${1:-}"
if [[ -z "$TARGET_VERSION" ]]; then
  echo "Usage: rollback_channel.sh <version>"
  exit 1
fi

CHANNEL_FILE="release/channels/stable.json"
if [[ ! -f "$CHANNEL_FILE" ]]; then
  echo "Missing channel file: $CHANNEL_FILE"
  exit 1
fi

node -e '
const fs = require("fs");
const file = process.argv[1];
const version = process.argv[2];
const payload = JSON.parse(fs.readFileSync(file, "utf8"));
payload.version = version;
payload.publishedAt = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");
' "$CHANNEL_FILE" "$TARGET_VERSION"

echo "Stable channel rolled back to $TARGET_VERSION"
