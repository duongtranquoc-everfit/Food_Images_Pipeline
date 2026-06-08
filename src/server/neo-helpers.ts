import { $ } from "bun";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";
import { NEO_CLI_PATH, CDP_URL, CDP_PORT, REMOVEBG_URL, REMOVEBG_TIMEOUT_MS, CHROME_PATH, CHROME_CDP_PROFILE } from "./config";

const TMP_JS = "/tmp/neo-eval-tmp.js";

/** Run a Neo CLI command */
export async function neo(...args: string[]): Promise<string> {
  const result = await $`node ${NEO_CLI_PATH} ${args}`.quiet().nothrow();
  return result.stdout.toString().trim();
}

/** Run JS in a remove.bg tab via Neo eval (file-based to avoid shell quoting) */
export async function neoEval(js: string): Promise<string> {
  writeFileSync(TMP_JS, js);
  const jsContent = readFileSync(TMP_JS, "utf-8");
  const result =
    await $`node ${NEO_CLI_PATH} eval ${jsContent} --tab remove.bg`
      .quiet()
      .nothrow();
  return result.stdout.toString().trim();
}

/** Check if Chrome CDP is reachable */
export async function isCdpReachable(): Promise<boolean> {
  try {
    const resp = await fetch(`${CDP_URL}/json/version`);
    return resp.ok;
  } catch {
    return false;
  }
}

/** Check if Neo CLI binary exists */
export function isNeoInstalled(): boolean {
  return existsSync(NEO_CLI_PATH);
}

/** Sync Chrome default profile to CDP profile directory */
async function syncChromeProfile(): Promise<void> {
  const defaultProfile = resolve(process.env.HOME!, "Library/Application Support/Google/Chrome");
  const cpDefault = resolve(CHROME_CDP_PROFILE, "Default");

  if (!existsSync(cpDefault)) {
    console.log("[neo] Copying Chrome profile for CDP use...");
    await $`mkdir -p ${CHROME_CDP_PROFILE}`.quiet();
    await $`cp -R ${resolve(defaultProfile, "Default")} ${cpDefault}`.quiet().nothrow();
    await $`cp ${resolve(defaultProfile, "Local State")} ${resolve(CHROME_CDP_PROFILE, "Local State")}`.quiet().nothrow();
  }
}

/** Launch Chrome with CDP enabled using a separate profile directory */
async function launchChromeWithCdp(): Promise<boolean> {
  await syncChromeProfile();

  console.log("[neo] Launching Chrome with CDP enabled...");
  const child = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${CHROME_CDP_PROFILE}`,
  ], { detached: true, stdio: "ignore" });
  child.unref();

  for (let i = 0; i < 15; i++) {
    await Bun.sleep(1000);
    if (await isCdpReachable()) {
      console.log(`[neo] Chrome launched with CDP on port ${CDP_PORT}`);
      return true;
    }
  }
  return false;
}

/** Connect to Chrome via CDP — auto-launches Chrome with CDP if needed */
export async function ensureCdp(): Promise<boolean> {
  // Try 1: CDP already reachable?
  if (await isCdpReachable()) {
    console.log("[neo] CDP already reachable, connecting...");
    await neo("connect");
    return true;
  }

  // Try 2: Attach to user's Chrome (via DevToolsActivePort)
  console.log("[neo] Trying neo attach...");
  const attachResult = await neo("attach");
  if (attachResult.includes("Connected")) {
    console.log("[neo] Attached to user's Chrome");
    return true;
  }

  // Try 3: Launch Chrome with CDP (separate profile so it can coexist with regular Chrome)
  const ok = await launchChromeWithCdp();
  if (ok) {
    await neo("connect");
    return true;
  }

  return false;
}

/** Track whether remove.bg tab is already open from a previous call */
let removeBgTabReady = false;

/** Ensure remove.bg tab is open and ready for upload — reuses existing tab when possible */
async function ensureRemoveBgTab(): Promise<void> {
  // Re-connect session once
  await neo("attach").catch(() => neo("connect"));

  const tabs = await neo("tab");
  const hasTab = tabs.includes("remove.bg");

  if (hasTab && removeBgTabReady) {
    // Tab exists from previous run — navigate back to upload page instead of close/reopen
    const resetJs = `(function() {
  // If we're still on the result page, navigate back to upload
  if (document.querySelector('canvas') || !document.querySelector('input[type="file"]')) {
    window.location.href = '${REMOVEBG_URL}';
    return 'navigating';
  }
  return 'ready';
})()`;
    const result = await neoEval(resetJs);
    if (result === "navigating") {
      await Bun.sleep(1500);
      await neo("wait", "--load", "networkidle", "--tab", "remove.bg");
    }
    return;
  }

  if (hasTab) {
    // Tab exists but from unknown state — close and reopen
    await neoEval("window.close()");
    await Bun.sleep(500);
  }

  // Open fresh tab
  await neo("open", REMOVEBG_URL);
  await Bun.sleep(1500);
  await neo("wait", "--load", "networkidle", "--tab", "remove.bg");
  removeBgTabReady = true;
}

/** Reset tab reuse state (call when CDP connection changes) */
export function resetRemoveBgTab(): void {
  removeBgTabReady = false;
}

/** Upload image to remove.bg and capture the result */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const imageBase64 = imageBuffer.toString("base64");
  const mimeType = "image/png";
  const fileName = "image.png";

  // Ensure tab is ready
  await ensureRemoveBgTab();

  // Inject image via file input or dropzone
  const uploadJs = `(function() {
  var b64 = "${imageBase64}";
  var byteChars = atob(b64);
  var byteArr = new Uint8Array(byteChars.length);
  for (var i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
  var file = new File([byteArr], "${fileName}", { type: "${mimeType}" });
  var input = document.querySelector('input[type="file"]');
  if (input) {
    var dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return 'uploaded-via-input';
  }
  var dropzone = document.querySelector('[class*="drop"], [class*="upload"]');
  if (dropzone) {
    var dt2 = new DataTransfer();
    dt2.items.add(file);
    dropzone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt2 }));
    return 'uploaded-via-drop';
  }
  return 'no-upload-target-found';
})()`;

  const uploadResult = await neoEval(uploadJs);
  console.log(`[neo] Upload: ${uploadResult}`);

  if (uploadResult === "no-upload-target-found") {
    throw new Error("No upload target found on remove.bg page");
  }

  // Poll for result canvas, then wait for full-quality render before capturing
  const startTime = Date.now();
  let pollInterval = 500;
  let pollCount = 0;
  while (Date.now() - startTime < REMOVEBG_TIMEOUT_MS) {
    await Bun.sleep(pollInterval);
    pollCount++;

    // Step 1: Check if result canvas exists (lightweight — no capture yet)
    const checkJs = `(function() {
  var canvases = document.querySelectorAll('canvas');
  if (canvases.length === 0) return 'no-canvas';
  for (var i = 0; i < canvases.length; i++) {
    var c = canvases[i];
    if (c.width < 100) continue;
    try {
      var ctx = c.getContext('2d');
      var corner = ctx.getImageData(5, 5, 1, 1).data;
      if (corner[3] > 0) continue;
      var center = ctx.getImageData(Math.floor(c.width/2), Math.floor(c.height/2), 1, 1).data;
      if (center[3] === 0) continue;
      return 'FOUND:' + i + ':' + c.width + 'x' + c.height;
    } catch(e) { continue; }
  }
  var spinner = document.querySelector('[class*="spinner"], [class*="loading"], [class*="progress"]');
  if (spinner) return 'processing';
  return 'waiting';
})()`;

    const status = await neoEval(checkJs);

    if (status.startsWith("FOUND:")) {
      const canvasIdx = status.split(":")[1];
      const initialSize = status.split(":")[2];
      console.log(`[neo] Result canvas detected: index=${canvasIdx}, size=${initialSize}`);

      // Step 2: Stabilization — wait for full-quality render
      // remove.bg often upgrades the canvas from low-res preview to full quality
      console.log("[neo] Waiting 2s for full-quality render...");
      await Bun.sleep(2000);

      // Step 3: Capture the stabilized, full-quality canvas
      const captureJs = `(function() {
  var c = document.querySelectorAll('canvas')[${canvasIdx}];
  if (!c) return 'ERROR:no-canvas';
  try {
    return 'DATA:' + c.width + 'x' + c.height + ':' + c.toDataURL('image/png').substring(22);
  } catch(e) { return 'ERROR:' + e.message; }
})()`;

      const result = await neoEval(captureJs);

      if (result.startsWith("ERROR:")) {
        throw new Error(`Canvas capture failed: ${result}`);
      }

      const parts = result.split(":");
      const finalSize = parts[1];
      const resultBase64 = parts.slice(2).join(":");
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[neo] BG removed in ${elapsed}s — canvas: ${initialSize} → ${finalSize} (${pollCount} polls)`);
      return Buffer.from(resultBase64, "base64");
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`[neo] ${elapsed}s - ${status}`);

    // Adaptive polling: 500ms×4 → 1000ms×6 → 2000ms after that
    if (pollCount === 4) pollInterval = 1000;
    else if (pollCount === 10) pollInterval = 2000;
  }

  // Timeout — take debug screenshot
  await neo("screenshot", "/tmp/neo-debug-removebg.png", "--tab", "remove.bg");
  throw new Error("Background removal timed out (debug screenshot at /tmp/neo-debug-removebg.png)");
}
