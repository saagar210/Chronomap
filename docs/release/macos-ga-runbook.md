# macOS GA Runbook

## RC Path

1. Build RC app artifact.
2. Package DMG with `scripts/release/macos/build_dmg.sh`.
3. Sign app and DMG.
4. Notarize and staple.
5. Verify Gatekeeper acceptance.
6. Publish RC metadata and checksums.

## Promotion Path

1. Validate immutable digest match.
2. Promote channel from RC to stable.
3. Start hypercare monitor window.
