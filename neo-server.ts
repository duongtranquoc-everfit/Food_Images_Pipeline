#!/usr/bin/env bun
/**
 * Neo Image Processing Server
 *
 * Local HTTP server that handles image processing for the extension:
 *   - Fetches images from URLs
 *   - Removes background via Neo CLI + remove.bg
 *   - Resizes onto white canvas
 *   - Returns processed image
 *
 * Usage: bun neo-server.ts
 */

import { SERVER_PORT, CDP_URL } from "./src/server/config";
import {
  isNeoInstalled,
  isCdpReachable,
  ensureCdp,
  removeBackground,
} from "./src/server/neo-helpers";
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

// --- Startup: try to connect CDP but don't fail if unavailable ---
console.log("[server] Starting Neo Image Processing Server...");

const neoAvailable = isNeoInstalled();
let cdpReady = false;

if (neoAvailable) {
  cdpReady = await ensureCdp();
  if (!cdpReady) {
    console.warn("[server] Chrome CDP not available. Background removal will be disabled.");
    console.warn("[server] To enable, run: neo start");
  }
} else {
  console.warn("[server] Neo CLI not found. Background removal will be disabled.");
  console.warn("[server] Server will still work for resize-only mode (skipBgRemoval=true).");
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
      const neo = isNeoInstalled();
      const cdp = await isCdpReachable();
      const bgRemovalAvailable = neo && cdp;

      // Server is always "ok" - bg removal is optional
      return jsonResponse({
        status: "ok",
        neo,
        cdp,
        bgRemovalAvailable,
        message: bgRemovalAvailable
          ? undefined
          : "Background removal unavailable. Resize-only mode active.",
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
