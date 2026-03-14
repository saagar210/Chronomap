# Release Secrets

## Required for signing + notarization

- `APPLE_CERTIFICATE_BASE64`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_TEAM_ID`
- `APPLE_ID_PASSWORD`

## Pre-credential mode

Before `APPLE_ID_PASSWORD` is available, run unsigned dry runs with:

- `ALLOW_UNSIGNED_RELEASE=true`

This allows full RC flow validation while marking signing/notarization as `not-run`.
