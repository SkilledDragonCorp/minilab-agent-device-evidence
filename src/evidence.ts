import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

export const TOOL_VERSION = "0.21.27";
export const EVIDENCE_DIR = join(import.meta.dir, "..", "out", "evidence");

export type EvidenceEntry = {
  path: string;
  sha256: string;
  bytes: number;
  toolVersion: string;
  collectedAt: string;
};

export function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function ensureEvidenceDir(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });
}

export async function writeEvidence(
  name: string,
  payload: unknown,
  collectedAt = new Date().toISOString(),
): Promise<EvidenceEntry> {
  await ensureEvidenceDir();
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  const filePath = join(EVIDENCE_DIR, name);
  await writeFile(filePath, body, "utf8");
  const digest = sha256Hex(body);
  const shaPath = join(EVIDENCE_DIR, `${name}.sha256`);
  await writeFile(shaPath, `${digest}  ${name}\n`, "utf8");
  const bytes = Buffer.byteLength(body, "utf8");
  return {
    path: `out/evidence/${name}`,
    sha256: digest,
    bytes,
    toolVersion: TOOL_VERSION,
    collectedAt,
  };
}

export function agentDeviceBin(): string {
  return join(import.meta.dir, "..", "node_modules", "agent-device", "bin", "agent-device.mjs");
}

export type SpawnJsonResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  json: unknown;
};

export async function spawnNodeJson(
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<SpawnJsonResult> {
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const bin = agentDeviceBin();
  const child = spawn("node", [bin, ...args], {
    cwd: opts.cwd ?? join(import.meta.dir, ".."),
    env: {
      ...process.env,
      DO_NOT_TRACK: "1",
      DISABLE_TELEMETRY: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  const exitCode: number = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`timeout after ${timeoutMs}ms: node ${bin} ${args.join(" ")}`));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code ?? 1);
    });
  });

  let json: unknown = null;
  const trimmed = stdout.trim();
  if (trimmed) {
    try {
      json = JSON.parse(trimmed);
    } catch {
      json = null;
    }
  }

  return { exitCode, stdout, stderr, json };
}

export async function closeAgentDevice(): Promise<void> {
  try {
    await spawnNodeJson(["close"], { timeoutMs: 30_000 });
  } catch {
    // close is best-effort; SESSION_NOT_FOUND is fine
  }
  await killAgentDeviceDaemons();
}

export async function killAgentDeviceDaemons(): Promise<void> {
  try {
    const proc = spawn("pkill", ["-f", "agent-device"], { stdio: "ignore" });
    await new Promise<void>((resolve) => {
      proc.on("close", () => resolve());
      proc.on("error", () => resolve());
    });
  } catch {
    // ignore
  }
}

export async function writeManifest(entries: EvidenceEntry[]): Promise<string> {
  await ensureEvidenceDir();
  const manifest = {
    toolVersion: TOOL_VERSION,
    collectedAt: new Date().toISOString(),
    platform: process.platform,
    node: process.version,
    files: entries,
  };
  const body = `${JSON.stringify(manifest, null, 2)}\n`;
  const path = join(EVIDENCE_DIR, "manifest.json");
  await writeFile(path, body, "utf8");
  return path;
}

export async function readManifest(): Promise<{
  toolVersion: string;
  collectedAt: string;
  files: EvidenceEntry[];
}> {
  const raw = await readFile(join(EVIDENCE_DIR, "manifest.json"), "utf8");
  return JSON.parse(raw) as {
    toolVersion: string;
    collectedAt: string;
    files: EvidenceEntry[];
  };
}

export async function listEvidenceFiles(): Promise<string[]> {
  await ensureEvidenceDir();
  const names = await readdir(EVIDENCE_DIR);
  return names.filter((n) => n.endsWith(".json") && n !== "manifest.json");
}

export async function fileBytes(relOrAbs: string): Promise<number> {
  const abs = relOrAbs.startsWith("/")
    ? relOrAbs
    : join(import.meta.dir, "..", relOrAbs);
  const s = await stat(abs);
  return s.size;
}
