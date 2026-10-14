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

test("agent-device devices --json writes evidence", async () => {
  await withDaemonLock(async () => {
    const result = await spawnNodeJson(["devices", "--json"]);
    expect(result.exitCode).toBe(0);
    expect(result.json).toBeTruthy();

    const body = result.json as {
      success?: boolean;
      data?: { devices?: Array<{ platform?: string; id?: string }> };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.devices)).toBe(true);
    expect((body.data?.devices ?? []).length).toBeGreaterThan(0);

    if (process.platform === "linux") {
      const linux = (body.data?.devices ?? []).find((d) => d.platform === "linux");
      expect(linux).toBeTruthy();
      expect(linux?.id).toBe("local");
    }

    const entry = await writeEvidence("devices.json", body);
    expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
}, 180_000);
