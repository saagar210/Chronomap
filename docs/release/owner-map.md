# Release Owner Map

| Role               | Primary          | Backup             | SLA | Authority                                 |
| ------------------ | ---------------- | ------------------ | --- | ----------------------------------------- |
| PM Approver        | PM               | Release Commander  | 30m | Final go/no-go and waiver approval        |
| Release Commander  | Engineering Lead | Backup Lead        | 15m | RC publish, promotion, rollback execution |
| QA Gate Owner      | QA Lead          | Dev Lead           | 30m | Quality gate integrity                    |
| Incident Commander | On-call Lead     | Backup On-call     | 15m | Incident triage and severity control      |
| Comms Owner        | PM/Comms         | Incident Commander | 30m | Stakeholder updates                       |
