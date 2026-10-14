#!/usr/bin/env bash
# Upstream CI cohort — gate ids copied verbatim from callstack/agent-device
# .github/workflows/ci.yml at 1658d637d64f920e40124ff5e3a35635d3b4f5d7
set -euo pipefail

export DO_NOT_TRACK=1
export DISABLE_TELEMETRY=1

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIN="1658d637d64f920e40124ff5e3a35635d3b4f5d7"

bash "${ROOT}/scripts/fetch-upstream.sh"
cd "${ROOT}/vendor/agent-device"

# Verbatim cohort from upstream ci.yml jobs typecheck-package / coverage / integration
# (each job runs via .github/actions/run-gate → pnpm gate "$INPUT_GATE" after
# pnpm install --frozen-lockfile with packageManager pnpm@11.17.0 / Node 24.13).
pnpm install --frozen-lockfile
pnpm gate typecheck
pnpm gate build
pnpm gate bundle-owner-files
pnpm gate unit-ci
pnpm gate tmpdir-leaks
pnpm clean:daemon
pnpm gate integration-node
pnpm gate concurrency-torture

echo "upstream CI cohort green at ${PIN}"
