# Hypercare Playbook (48h)

## Monitors

- Startup failure rate
- Crash-free session rate
- Import/export error rate
- AI fallback error rate

## Default Trigger Thresholds

- Startup failure rate > 2.0% sustained for 15 minutes.
- Crash-free sessions < 98.0% sustained for 15 minutes.
- Import/export failures > 1.0% sustained for 30 minutes.
- Any Sev1 incident immediately.

## Actions

1. Trigger rollback workflow when threshold is breached.
2. Publish incident update every 60 minutes until stabilized.
3. Keep hypercare open for full 48h after stable launch.
