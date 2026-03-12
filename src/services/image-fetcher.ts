import { FETCH_TIMEOUT_MS } from "../shared/constants";

export async function fetchImage(
  url: string,
  abortSignal?: AbortSignal
): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  // Chain external abort signal
  if (abortSignal) {
    if (abortSignal.aborted) {
      controller.abort();
    } else {
      abortSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  } finally {
    clearTimeout(timeoutId);
  }
}
