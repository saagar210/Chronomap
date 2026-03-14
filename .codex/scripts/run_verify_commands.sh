#!/usr/bin/env bash
set -euo pipefail

COMMANDS_FILE="${1:-.codex/verify.commands}"

if [[ ! -f "$COMMANDS_FILE" ]]; then
  echo "Missing $COMMANDS_FILE"
  exit 2
fi

node .codex/scripts/run_verify_commands.mjs "$COMMANDS_FILE"
