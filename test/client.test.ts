import { afterAll, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { closeAgentDevice, writeEvidence } from "../src/evidence.ts";
import { withDaemonLock } from "../src/daemon-lock.ts";

const root = join(import.meta.dir, "..");

afterAll(async () => {
  await closeAgentDevice();
});

async function runClientSmoke(): Promise<{ exitCode: number; json: unknown; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [join(root, "scripts", "client-smoke.mjs")], {
      cwd: root,
      env: {
        ...process.env,
        DO_NOT_TRACK: "1",
        DISABLE_TELEMETRY: "1",
        SD_LAB_SESSION: "sd-lab",
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
      reject(new Error(`client-smoke timeout: ${stderr || stdout}`));
    }, 180_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      let json: unknown = null;
      try {
        json = JSON.parse(stdout.trim());
      } catch {
        json = null;
      }
      if (code !== 0) {
        reject(new Error(`client-smoke exit ${code}: ${stderr || stdout}`));
        return;
      }
      resolve({ exitCode: code ?? 1, json, stdout });
    });
  });
}

test("typed createAgentDeviceClient lists devices under Node 24", async () => {
  await withDaemonLock(async () => {
    const result = await runClientSmoke();
    expect(result.exitCode).toBe(0);
    expect(result.json).toBeTruthy();

    const body = result.json as {
      success?: boolean;
      devices?: Array<{ platform?: string; id?: string; target?: string }>;
      namespaces?: string[];
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.devices)).toBe(true);
    expect((body.devices ?? []).length).toBeGreaterThan(0);

    if (process.platform === "linux") {
      const linux = (body.devices ?? []).find((d) => d.platform === "linux");
      expect(linux).toBeTruthy();
      expect(linux?.id).toBe("local");
      expect(linux?.target).toBe("desktop");
    }

    expect(body.namespaces).toContain("devices");
    expect(body.namespaces).toContain("sessions");

    await writeEvidence("client.json", body);
  });
}, 180_000);
