import { existsSync } from "fs";
import { spawn } from "child_process";
import {
  BG_SERVER_URL,
  BG_SERVER_TIMEOUT_MS,
  BG_PYTHON,
  BG_SERVER_SCRIPT,
  BG_MODE,
} from "./config";

let bgServerStarting: Promise<void> | null = null;

/** Is the local InSPyReNet bg server up and responding? */
export async function bgHealthy(): Promise<boolean> {
  try {
    const r = await fetch(`${BG_SERVER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Ensure the local InSPyReNet bg server (bg_server.py) is running & healthy.
 *  Spawns it as an arm64 process (for Apple-Silicon MPS) if not already up. */
export async function ensureBgServer(): Promise<boolean> {
  if (await bgHealthy()) return true;
  if (!bgServerStarting) {
    bgServerStarting = (async () => {
      if (!existsSync(BG_PYTHON)) {
        throw new Error(`InSPyReNet venv python not found at ${BG_PYTHON}`);
      }
      console.log("[bg] starting InSPyReNet server (loading model, ~10s)...");
      const child = spawn("arch", ["-arm64", BG_PYTHON, BG_SERVER_SCRIPT], {
        detached: true,
        stdio: "ignore",
        env: { ...process.env, BG_MODE },
      });
      child.unref();
    })();
  }
  try {
    await bgServerStarting;
  } catch (e) {
    bgServerStarting = null;
    throw e;
  }
  for (let i = 0; i < 60; i++) {
    if (await bgHealthy()) return true;
    await Bun.sleep(1000);
  }
  return false;
}

/**
 * Background removal via the local InSPyReNet server (replaces the old remove.bg
 * website path). The Python server keeps the model warm on MPS (~1-1.5s/image).
 * Serialized — a single warm model isn't safe to run concurrently.
 */
let bgChain: Promise<unknown> = Promise.resolve();
export function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const run = bgChain.then(() => removeBackgroundImpl(imageBuffer));
  bgChain = run.catch(() => {});
  return run;
}

async function removeBackgroundImpl(imageBuffer: Buffer): Promise<Buffer> {
  await ensureBgServer();
  const t0 = Date.now();
  const resp = await fetch(`${BG_SERVER_URL}/remove`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: imageBuffer,
    signal: AbortSignal.timeout(BG_SERVER_TIMEOUT_MS),
  });
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      msg = ((await resp.json()) as { error?: string }).error || msg;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`Background removal failed: ${msg}`);
  }
  const out = Buffer.from(await resp.arrayBuffer());
  console.log(
    `[bg] removed in ${((Date.now() - t0) / 1000).toFixed(2)}s (${(out.byteLength / 1024).toFixed(1)} KB)`
  );
  return out;
}
