# minilab-agent-device-evidence

Evidence-first device testing with [callstack/agent-device](https://github.com/callstack/agent-device) (MIT) — CLI + MCP + typed Node API for iOS / Android / HarmonyOS / TV / web / macOS / Linux.

Hook contrast: research about devices nobody controls. This lab shows the opposite — your agent drives devices **you** own and leaves sha256 evidence.

**Built by SkilledDragon LLC — architecture-led software engineering · [skilleddragon.com](https://skilleddragon.com)**

## What we built

- Bun/TS lab pinning `agent-device@0.21.27` (`bun.lock` committed).
- Keyless Linux evidence: `doctor --json`, `devices --json`, typed `createAgentDeviceClient` under Node 24, plus `out/evidence/manifest.json`.
- Skill: `.claude/skills/device-evidence/SKILL.md`.
- Upstream CI cohort at `1658d637d64f` via `scripts/upstream-ci.sh` (verbatim `pnpm gate` ids from upstream `.github/workflows/ci.yml`).

## Pins

| Item | Value |
| --- | --- |
| npm package | `agent-device@0.21.27` |
| upstream SHA | `1658d637d64f920e40124ff5e3a35635d3b4f5d7` |
| lab Node | `>=24` (`.nvmrc` = `24`) |
| upstream Node / pnpm | `24.13` / `11.17.0` |

## What we tested + results

Observed on Linux x64 (Notion box run 2026-10-13) and reproduced in this lab’s CI `lab` job:

| Probe | Result |
| --- | --- |
| `agent-device --version` | `0.21.27` |
| `doctor --json` | `success: true`, `data.status: "warn"`, missing adb/hdc/Apple tools as `TOOL_MISSING` / platform notes — no hard blockers |
| `devices --json` | `success: true`; ubuntu has `{ platform: "linux", id: "local", target: "desktop", booted: true }` |
| typed client | `devices.list()` returns the linux desktop device; always `sessions.close()` in teardown |

Evidence artifacts (gitignored, uploaded from CI): `out/evidence/doctor.json`, `devices.json`, `client.json`, `manifest.json` (+ `.sha256` sidecars).

Local macOS can run the same suite (simulators / macos desktop appear instead of linux). Full Linux evidence is the GitHub Actions `lab` job when Docker is unavailable locally.

## Quickstart

```bash
bun install --frozen-lockfile
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 bun test --max-concurrency=1
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 bun run collect
```

Upstream cohort (needs network + pnpm 11.17.0 + Node 24.13):

```bash
bash scripts/upstream-ci.sh
```

## Tutorial

1. **Install** — `bun install --frozen-lockfile` (Node 24 on PATH for CLI/client child processes).
2. **Doctor** — `node node_modules/agent-device/bin/agent-device.mjs doctor --json` → save under `out/evidence/`.
3. **Devices** — `… devices --json` → confirm the linux `local` desktop device on ubuntu.
4. **Typed client** — `node scripts/client-smoke.mjs` → `createAgentDeviceClient` → `devices.list()` → `sessions.close()`.
5. **Manifest** — `bun run collect` writes sha256 + byte size + tool version + ISO timestamp.
6. **Optional web lane** — manual only (`workflow_dispatch`): `web setup` → `web doctor` → `open https://example.com --platform web` → `snapshot` / `screenshot` → `close`. Record the backend version `web setup` prints. Never on push/PR.
7. **Real phones later** — install `adb` (Android) or Xcode (Apple); re-run doctor until device checks pass.

## Using these skills in Claude Code and Cursor

Both read skills from `.claude/skills/<name>/SKILL.md` only.

- Claude Code: skills under `.claude/skills/` load automatically in that project.
- Cursor: same path — do **not** create `.cursor/skills` or `.agents/skills` mirrors (CI fails if they exist).

Skill in this lab: `device-evidence` — doctor first, CLI loop with `--settle` and verification helpers, evidence paths in the final report. Quote: **"a bare screenshot is not verification"**.

## API keys

None for the keyless lane. Real-device runs use local tooling, not cloud keys. See `.env.example`.

## Telemetry

CI sets `DO_NOT_TRACK=1` and `DISABLE_TELEMETRY=1`. At upstream pin `1658d637d64f`, `src/` has no dedicated telemetry opt-out variable (hits are recording-overlay filenames). The web backend is downloaded only by `web setup` (manual lane).

## Security

See [SECURITY.md](./SECURITY.md). Contact: **hello@skilleddragon.com**.

## License

MIT (lab). Upstream [agent-device](https://github.com/callstack/agent-device) is MIT.
