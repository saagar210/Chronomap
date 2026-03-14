#!/usr/bin/env bash
set -euo pipefail

missing=0

check_required() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required secret/env: $key"
    missing=1
  fi
}

echo "Checking release secret readiness..."
check_required APPLE_CERTIFICATE_BASE64
check_required APPLE_CERTIFICATE_PASSWORD
check_required APPLE_SIGNING_IDENTITY
check_required APPLE_ID
check_required APPLE_TEAM_ID

if [[ -z "${APPLE_ID_PASSWORD:-}" ]]; then
  echo "Missing APPLE_ID_PASSWORD (expected until final credential handoff)."
else
  echo "APPLE_ID_PASSWORD is set."
fi

if [[ $missing -eq 1 ]]; then
  echo "Release secrets are not fully configured."
  exit 1
fi

echo "Release secrets baseline is configured (excluding optional APPLE_ID_PASSWORD check)."
