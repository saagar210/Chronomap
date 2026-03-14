#!/usr/bin/env bash
set -euo pipefail

RC_METADATA="${1:-release/release-metadata-rc.json}"
STABLE_METADATA="${2:-release/release-metadata.json}"

if [[ ! -f "$RC_METADATA" ]]; then
  echo "Missing RC metadata: $RC_METADATA"
  exit 1
fi

cp "$RC_METADATA" "$STABLE_METADATA"
echo "Promoted immutable metadata from RC to stable."
