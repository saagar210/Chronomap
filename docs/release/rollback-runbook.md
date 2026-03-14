# Rollback Runbook

## Preconditions

- Previous stable artifact checksum is available.
- Channel file update path is available.

## Steps

1. Select rollback target version.
2. Validate checksum against release metadata.
3. Update channel manifest to previous stable.
4. Publish rollback comms.
5. Open incident timeline and closeout task.
