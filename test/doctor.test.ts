import { afterAll, expect, test } from "bun:test";
import {
  closeAgentDevice,
  spawnNodeJson,
  writeEvidence,
} from "../src/evidence.ts";
import { withDaemonLock } from "../src/daemon-lock.ts";

afterAll(async () => {
  await closeAgentDevice();
});

test("agent-device doctor --json writes evidence", async () => {
  await withDaemonLock(async () => {
    const result = await spawnNodeJson(["doctor", "--json"]);
    expect(result.exitCode).toBe(0);
    expect(result.json).toBeTruthy();

    const body = result.json as {
      success?: boolean;
      data?: {
        status?: string;
        checks?: Array<{ id?: string; status?: string; summary?: string }>;
      };
    };
    expect(body.success).toBe(true);
    const status = body.data?.status;
    expect(status === "ok" || status === "warn").toBe(true);
    expect(Array.isArray(body.data?.checks)).toBe(true);
    for (const check of body.data?.checks ?? []) {
      expect(typeof check.id).toBe("string");
      expect(typeof check.status).toBe("string");
      expect(typeof check.summary).toBe("string");
    }

    const entry = await writeEvidence("doctor.json", body);
    expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(entry.toolVersion).toBe("0.21.27");
  });
}, 180_000);
