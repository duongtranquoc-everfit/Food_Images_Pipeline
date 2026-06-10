const NEO_SERVER_URL = "http://localhost:3456";

export interface ServerStatus {
  ok: boolean;
  bgRemovalAvailable?: boolean;
  message?: string;
}

/** Check if the Neo processing server is running and healthy */
export async function checkNeoServer(): Promise<ServerStatus> {
  try {
    const resp = await fetch(`${NEO_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await resp.json();

    if (resp.ok && data.status === "ok") {
      return {
        ok: true,
        bgRemovalAvailable: data.bgRemovalAvailable ?? false,
        message: data.message,
      };
    }

    return {
      ok: false,
      message: data.message || "Neo server is not ready",
    };
  } catch {
    return {
      ok: false,
      message: "Server chưa chạy. Chạy lệnh: bun image-server.ts",
    };
  }
}

/** Send image URL to Neo server for processing, returns processed image blob */
export async function processViaServer(
  imageUrl: string,
  width: number,
  height: number,
  abortSignal?: AbortSignal,
  skipBgRemoval?: boolean
): Promise<Blob> {
  const resp = await fetch(`${NEO_SERVER_URL}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, width, height, skipBgRemoval }),
    signal: abortSignal,
  });

  if (!resp.ok) {
    let errorMsg = `Server error (${resp.status})`;
    try {
      const data = await resp.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return resp.blob();
}
