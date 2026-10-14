import { mkdir, open, unlink } from "node:fs/promises";
import { join } from "node:path";

const LOCK_DIR = join(import.meta.dir, "..", "out", ".tmp");
const LOCK_PATH = join(LOCK_DIR, "agent-device.lock");

/** Serialize agent-device CLI/client use across bun test files. */
export async function withDaemonLock<T>(fn: () => Promise<T>): Promise<T> {
  await mkdir(LOCK_DIR, { recursive: true });
  const started = Date.now();
  const deadline = started + 300_000;
  while (true) {
    try {
      const handle = await open(LOCK_PATH, "wx");
      await handle.writeFile(String(process.pid));
      await handle.close();
      try {
        return await fn();
      } finally {
        await unlink(LOCK_PATH).catch(() => undefined);
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw err;
      if (Date.now() > deadline) {
        throw new Error("timed out waiting for agent-device daemon lock");
      }
      await Bun.sleep(250);
    }
  }
}
