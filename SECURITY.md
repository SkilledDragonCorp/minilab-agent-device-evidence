# Security Policy

**Built by [SkilledDragon LLC](https://skilleddragon.com)**

This is a **SkilledDragon educational minilab**, not a production product. We do **not** maintain these repos on a regular schedule and we do **not** operate a vulnerability response program for them.

## Supported versions

Only the default branch (`main`) of this minilab is considered current. Older commits are archival.

## Contact

General questions: **hello@skilleddragon.com**  
Do not use a dedicated security mailbox for this repo — none exists.

## If you find an issue

- Prefer reporting **upstream** when the issue is in [callstack/agent-device](https://github.com/callstack/agent-device) (MIT) or other dependencies.
- For something specific to this minilab’s scripts or CI, you may email hello@skilleddragon.com. There is **no SLA**, and we may not patch or reply quickly.
- Do not expect private coordinated disclosure or paid bounty handling here.

## Secret-handling policy

- No API keys are required for the keyless CI lane (`bun test`, upstream `pnpm gate` cohort).
- Real-device runs need local tooling (`adb` / Xcode), not cloud API keys.
- The optional web lane (`agent-device web setup`) downloads a managed browser backend and is **manual-only** (`workflow_dispatch`); it never runs on push/PR.
- Telemetry is disabled in CI and local automation via `DISABLE_TELEMETRY=1` and `DO_NOT_TRACK=1`. Upstream `src/` at the pin has no dedicated telemetry opt-out variable (only recording-overlay filename hits).

## Tooling pins

| Check | Pin |
| --- | --- |
| npm `agent-device` | `0.21.27` |
| callstack/agent-device | `1658d637d64f` |
| gitleaks | `v8.30.1` (CI downloads the release binary and verifies SHA256) |
| osv-scanner | `v2.7.0` (CI downloads the release binary and verifies SHA256) |
| Node (lab) | `>=24` (`.nvmrc` = `24`) |
| Node (upstream gates) | `24.13` |
| pnpm (upstream) | `11.17.0` |

Pre-commit: `.pre-commit-config.yaml` pins the gitleaks hook to the same release tag.

Use at your own risk. Pin versions, review the code, and treat this as sample material.
