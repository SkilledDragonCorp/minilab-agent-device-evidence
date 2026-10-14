import { afterAll, expect, test } from "bun:test";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  closeAgentDevice,
  EVIDENCE_DIR,
  TOOL_VERSION,
  writeManifest,
  writeEvidence,
  spawnNodeJson,
  type EvidenceEntry,
  sha256Hex,
} from "../src/evidence.ts";
import { withDaemonLock } from "../src/daemon-lock.ts";
import { spawn } from "node:child_process";

afterAll(async () => {
  await closeAgentDevice();
});

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureEvidenceFile(name: string): Promise<EvidenceEntry> {
  const path = join(EVIDENCE_DIR, name);
  if (await exists(path)) {
    const body = await readFile(path, "utf8");
    const digest = sha256Hex(body);
    return {
      path: `out/evidence/${name}`,
      sha256: digest,
      bytes: Buffer.byteLength(body, "utf8"),
      toolVersion: TOOL_VERSION,
      collectedAt: new Date().toISOString(),
    };
  }

  if (name === "doctor.json") {
    const result = await spawnNodeJson(["doctor", "--json"]);
    expect(result.exitCode).toBe(0);
    const body = result.json as { success?: boolean };
    expect(body.success).toBe(true);
    return writeEvidence(name, body);
  }
  if (name === "devices.json") {
    const result = await spawnNodeJson(["devices", "--json"]);
    expect(result.exitCode).toBe(0);
    const body = result.json as { success?: boolean };
    expect(body.success).toBe(true);
    return writeEvidence(name, body);
  }
  if (name === "client.json") {
    const root = join(import.meta.dir, "..");
    const json = await new Promise<unknown>((resolve, reject) => {
      const child = spawn("node", [join(root, "scripts", "client-smoke.mjs")], {
        cwd: root,
        env: {
          ...process.env,
          DO_NOT_TRACK: "1",
          DISABLE_TELEMETRY: "1",
          SD_LAB_SESSION: "sd-lab-evidence",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (c: string) => {
        stdout += c;
      });
      child.stderr.on("data", (c: string) => {
        stderr += c;
      });
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("client-smoke timeout"));
      }, 180_000);
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) reject(new Error(`client-smoke exit ${code}: ${stderr}`));
        else resolve(JSON.parse(stdout.trim()));
      });
    });
    return writeEvidence(name, json);
  }
  throw new Error(`unknown evidence file ${name}`);
}

test("evidence manifest lists sha256, bytes, tool version, ISO timestamp", async () => {
  await withDaemonLock(async () => {
    const entries: EvidenceEntry[] = [];
    for (const name of ["doctor.json", "devices.json", "client.json"]) {
      entries.push(await ensureEvidenceFile(name));
    }
    await writeManifest(entries);

    const raw = await readFile(join(EVIDENCE_DIR, "manifest.json"), "utf8");
    const manifest = JSON.parse(raw) as {
      toolVersion: string;
      collectedAt: string;
      files: EvidenceEntry[];
    };

    expect(manifest.toolVersion).toBe(TOOL_VERSION);
    expect(Number.isNaN(Date.parse(manifest.collectedAt))).toBe(false);
    expect(manifest.files.length).toBe(3);

    for (const name of ["doctor.json", "devices.json", "client.json"]) {
      const entry = manifest.files.find((f) => f.path.endsWith(name));
      expect(entry).toBeTruthy();
      expect(entry!.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry!.bytes).toBeGreaterThan(0);
      expect(entry!.toolVersion).toBe(TOOL_VERSION);
      expect(Number.isNaN(Date.parse(entry!.collectedAt))).toBe(false);

      const body = await readFile(join(EVIDENCE_DIR, name), "utf8");
      expect(sha256Hex(body)).toBe(entry!.sha256);
      expect(Buffer.byteLength(body, "utf8")).toBe(entry!.bytes);
    }
  });
}, 360_000);
