#!/usr/bin/env node
/**
 * Plain ESM Node 24 smoke: typed createAgentDeviceClient.
 * Prints JSON of devices.list() then closes the session.
 */
import { createAgentDeviceClient } from "agent-device";

const session = process.env.SD_LAB_SESSION ?? "sd-lab";

const client = createAgentDeviceClient({ session });
try {
  const devices = await client.devices.list();
  const payload = {
    success: true,
    session,
    toolVersion: "0.21.27",
    collectedAt: new Date().toISOString(),
    devices,
    namespaces: Object.keys(client).sort(),
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
} finally {
  try {
    await client.sessions.close();
  } catch {
    // ignore close errors
  }
}
