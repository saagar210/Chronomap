#!/usr/bin/env bash
set -euo pipefail

# codex-os-managed
max_bytes="${ASSET_MAX_BYTES:-350000}"
mkdir -p .perf-results

if [[ ! -d public ]]; then
  cat > .perf-results/assets.json <<JSON
{
  "status": "not-run",
  "reason": "public directory not found",
  "capturedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON
  echo "No public directory found; skipping asset check."
  exit 0
fi

fail=0
checked=0
oversized=0
while IFS= read -r file; do
  checked=$((checked + 1))
  size=$(wc -c < "$file")
  if (( size > max_bytes )); then
    echo "Asset too large (>${max_bytes} bytes): $file"
    fail=1
    oversized=$((oversized + 1))
  fi
done < <(find public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.webp" -o -name "*.avif" \))

status="pass"
if (( fail == 1 )); then
  status="fail"
fi

cat > .perf-results/assets.json <<JSON
{
  "status": "${status}",
  "checkedFiles": ${checked},
  "oversizedFiles": ${oversized},
  "maxBytes": ${max_bytes},
  "capturedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON

exit $fail
