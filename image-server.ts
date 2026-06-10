#!/usr/bin/env bun
/**
 * Neo Image Processing Server
 *
 * Local HTTP server that handles image processing for the extension:
 *   - Fetches images from URLs
 *   - Removes background via local InSPyReNet server (bg_server.py)
 *   - Resizes onto white canvas
 *   - Returns processed image
 *
 * Usage: bun image-server.ts
 */

import { SERVER_PORT, BG_SERVER_URL, BG_MODE } from "./src/server/config";
import {
  ensureBgServer,
  bgHealthy,
  removeBackground,
} from "./src/server/bg-helpers";
import { resizeImage } from "./src/server/image-resize";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// --- Resilience: never let a single request's stray error kill the server ---
process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection (ignored, server stays up):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception (ignored, server stays up):", err);
});

// --- Startup: try to connect CDP but don't fail if unavailable ---
console.log("[server] Starting Image Processing Server...");

// Background removal now uses the local InSPyReNet server (bg_server.py) instead
// of the remove.bg website. Start it (loads the model warm) so the first request
// isn't slow; resize-only mode still works even if it fails to start.
let bgReady = false;
try {
  bgReady = await ensureBgServer();
  if (bgReady) {
    console.log(`[server] Background removal ready via InSPyReNet (${BG_SERVER_URL}, mode=${BG_MODE})`);
  } else {
    console.warn("[server] InSPyReNet server did not become healthy in time. Background removal disabled.");
  }
} catch (e) {
  console.warn(`[server] Could not start InSPyReNet server: ${(e as Error).message}`);
  console.warn("[server] Server still works for resize-only mode (skipBgRemoval=true).");
}

// --- Server ---
Bun.serve({
  port: SERVER_PORT,

  async fetch(req) {
    const url = new URL(req.url);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // GET /health
    if (url.pathname === "/health" && req.method === "GET") {
      const bgRemovalAvailable = await bgHealthy();
      return jsonResponse({
        status: "ok",
        engine: "inspyrenet",
        bgServer: BG_SERVER_URL,
        bgMode: BG_MODE,
        bgRemovalAvailable,
        message: bgRemovalAvailable
          ? undefined
          : "Background removal server not ready. Resize-only mode active.",
      });
    }

    // POST /process
    if (url.pathname === "/process" && req.method === "POST") {
      let body: { imageUrl?: string; width?: number; height?: number; skipBgRemoval?: boolean };
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const { imageUrl, width, height, skipBgRemoval } = body;
      if (!imageUrl || !width || !height) {
        return jsonResponse(
          { error: "Missing required fields: imageUrl, width, height" },
          400
        );
      }

      console.log(`[process] ${imageUrl} → ${width}x${height}${skipBgRemoval ? " (no bg removal)" : ""}`);

      // Step 1: Fetch image
      let imageBuffer: Buffer;
      try {
        const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const contentType = resp.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          throw new Error(`Not an image: ${contentType}`);
        }
        imageBuffer = Buffer.from(await resp.arrayBuffer());
        console.log(`[process] Fetched: ${(imageBuffer.byteLength / 1024).toFixed(1)} KB`);
      } catch (err) {
        return jsonResponse(
          { error: `Failed to fetch image: ${(err as Error).message}` },
          422
        );
      }

      // Step 2: Remove background (skip if not needed)
      let bufferForResize: Buffer;
      if (skipBgRemoval) {
        bufferForResize = imageBuffer;
      } else {
        try {
          bufferForResize = await removeBackground(imageBuffer);
          console.log(`[process] BG removed: ${(bufferForResize.byteLength / 1024).toFixed(1)} KB`);
        } catch (err) {
          return jsonResponse(
            { error: `Background removal failed: ${(err as Error).message}` },
            422
          );
        }
      }

      // Step 3: Resize onto white canvas
      let resultBuffer: Buffer;
      try {
        resultBuffer = await resizeImage(bufferForResize, width, height);
        console.log(`[process] Resized: ${(resultBuffer.byteLength / 1024).toFixed(1)} KB`);
      } catch (err) {
        return jsonResponse(
          { error: `Resize failed: ${(err as Error).message}` },
          422
        );
      }

      return new Response(resultBuffer, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "image/jpeg",
          "Content-Length": String(resultBuffer.byteLength),
        },
      });
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
});

console.log(`[server] Listening on http://localhost:${SERVER_PORT}`);
console.log(`[server] Endpoints: GET /health, POST /process`);
