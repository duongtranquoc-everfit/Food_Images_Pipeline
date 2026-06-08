// Force single-thread mode for ONNX Runtime
// SharedArrayBuffer requires cross-origin isolation which sandbox iframe doesn't have
// @imgly reads navigator.hardwareConcurrency to set numThreads, so we override it
Object.defineProperty(navigator, "hardwareConcurrency", { value: 1 });

import { removeBackground } from "@imgly/background-removal";

const BG_REMOVAL_TIMEOUT = 180_000; // 3 minutes max (single thread is slower)

// Listen for messages from the parent (panel iframe host)
window.addEventListener("message", async (event) => {
  if (event.data?.type !== "REMOVE_BG") return;

  const { id, imageData } = event.data as {
    id: string;
    imageData: ArrayBuffer;
  };

  console.log(`[Sandbox] Received BG removal request #${id} (${(imageData.byteLength / 1024).toFixed(0)}KB)`);

  try {
    const blob = new Blob([imageData]);

    const resultBlob = await Promise.race([
      removeBackground(blob, {
        device: "cpu",
        model: "small",
        output: { format: "image/png", quality: 0.8 },
        progress: (key: string, current: number, total: number) => {
          console.log(`[Sandbox] Progress: ${key} ${current}/${total}`);
          window.parent.postMessage(
            { type: "BG_PROGRESS", id, key, current, total },
            "*"
          );
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Background removal timed out")), BG_REMOVAL_TIMEOUT)
      ),
    ]);

    const resultBuffer = await resultBlob.arrayBuffer();
    console.log(`[Sandbox] BG removal success, result: ${(resultBuffer.byteLength / 1024).toFixed(0)}KB`);
    window.parent.postMessage(
      { type: "BG_RESULT", id, ok: true, data: resultBuffer },
      "*",
      [resultBuffer]
    );
  } catch (err) {
    console.error("[Sandbox] BG removal failed:", err);
    window.parent.postMessage(
      {
        type: "BG_RESULT",
        id,
        ok: false,
        error: (err as Error).message,
      },
      "*"
    );
  }
});

// Signal ready
window.parent.postMessage({ type: "BG_SANDBOX_READY" }, "*");
console.log("[Sandbox] Background removal sandbox loaded (single-thread mode)");
