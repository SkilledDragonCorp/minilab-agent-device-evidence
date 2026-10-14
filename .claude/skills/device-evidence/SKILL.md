---
name: device-evidence
description: >-
  Run agent-device doctor --json first, drive owned devices with the CLI loop,
  and save sha256 evidence — a bare screenshot is not verification.
---

# Device evidence

Use this skill when an agent must drive **devices you own** (iOS / Android /
HarmonyOS / TV / web / macOS / Linux) and leave auditable JSON evidence.

## Required loop

1. **Doctor first** — run `agent-device doctor --json`. Persist the JSON (and a
   sha256 sidecar) before any automation. Fix hard blockers; treat `warn` as
   actionable but not fatal for the keyless Linux desktop lane.

2. **Open** — `agent-device open <app> --foreground` (or the platform-specific
   open form from `agent-device help`).

3. **Act with settle** — every interaction uses `--settle` so the UI can catch
   up before the next command.

4. **Verify** — use `wait text` / `is` / `find` (CLI verification helpers).
   Quote from the CLI help: **"a bare screenshot is not verification"**.

5. **Close** — always end with `agent-device close` (and `sessions.close()` for
   the typed client) so daemons do not linger.

6. **Evidence in the final report** — include paths under `out/evidence/`:
   `doctor.json`, `devices.json`, `client.json`, and `manifest.json` (sha256,
   byte size, tool version `0.21.27`, ISO timestamp).

## Keyless Linux quickstart

```bash
bun install --frozen-lockfile
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 bun test
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 bun run collect
```

## Typed client

```js
import { createAgentDeviceClient } from "agent-device";
const client = createAgentDeviceClient({ session: "sd-lab" });
const devices = await client.devices.list();
await client.sessions.close();
```

## Upstream pin

Featured package: `agent-device@0.21.27` (MIT). Upstream cohort at
`callstack/agent-device@1658d637d64f` via `bash scripts/upstream-ci.sh`.
