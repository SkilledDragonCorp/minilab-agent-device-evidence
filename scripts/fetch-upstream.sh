#!/usr/bin/env bash
# Clone callstack/agent-device at the pinned SHA (no --depth; coverage needs full history).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIN="1658d637d64f920e40124ff5e3a35635d3b4f5d7"
DEST="${ROOT}/vendor/agent-device"

mkdir -p "${ROOT}/vendor"
if [[ -d "${DEST}/.git" ]]; then
  git -C "${DEST}" fetch --tags origin
  git -C "${DEST}" checkout "${PIN}"
else
  rm -rf "${DEST}"
  git clone https://github.com/callstack/agent-device.git "${DEST}"
  git -C "${DEST}" checkout "${PIN}"
fi

git -C "${DEST}" rev-parse HEAD
echo "upstream pin ${PIN} ready at ${DEST}"
