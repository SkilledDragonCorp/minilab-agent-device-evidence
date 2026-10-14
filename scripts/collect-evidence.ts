#!/usr/bin/env bun
/**
 * Collect doctor + devices + typed-client evidence and write out/evidence/manifest.json.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  closeAgentDevice,
  spawnNodeJson,
  writeEvidence,
  writeManifest,
  type EvidenceEntry,
} from "../src/evidence.ts";

const root = join(import.meta.dir, "..");

async function runClientSmoke(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "node",
      [join(root, "scripts", "client-smoke.mjs")],
      {
        cwd: root,
        env: {
          ...process.env,
          DO_NOT_TRACK: "1",
          DISABLE_TELEMETRY: "1",
          SD_LAB_SESSION: "sd-lab-collect",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
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
      reject(new Error("client-smoke timed out"));
    }, 180_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`client-smoke exit ${code}: ${stderr || stdout}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function main(): Promise<void> {
  const entries: EvidenceEntry[] = [];
  const collectedAt = new Date().toISOString();

  const doctor = await spawnNodeJson(["doctor", "--json"]);
  if (doctor.exitCode !== 0 || !doctor.json) {
    throw new Error(`doctor failed: exit=${doctor.exitCode} stderr=${doctor.stderr}`);
  }
  const doctorBody = doctor.json as { success?: boolean };
  if (doctorBody.success !== true) {
    throw new Error(`doctor success !== true: ${doctor.stdout.slice(0, 500)}`);
  }
  entries.push(await writeEvidence("doctor.json", doctor.json, collectedAt));

  const devices = await spawnNodeJson(["devices", "--json"]);
  if (devices.exitCode !== 0 || !devices.json) {
    throw new Error(`devices failed: exit=${devices.exitCode} stderr=${devices.stderr}`);
  }
  const devicesBody = devices.json as { success?: boolean };
  if (devicesBody.success !== true) {
    throw new Error(`devices success !== true: ${devices.stdout.slice(0, 500)}`);
  }
  entries.push(await writeEvidence("devices.json", devices.json, collectedAt));

  const client = await runClientSmoke();
  entries.push(await writeEvidence("client.json", client, collectedAt));

  const manifestPath = await writeManifest(entries);
  console.log(`wrote ${entries.length} evidence files + ${manifestPath}`);

  await closeAgentDevice();
}

await main();
