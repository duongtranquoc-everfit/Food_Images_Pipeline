## Context

The extension currently processes images through an internal pipeline: fetch image → remove background (via content script automating remove.bg tab) → resize (via OffscreenCanvas). This is fragile and limited by Chrome extension constraints (CSP, service worker lifecycle).

A proof-of-concept using Neo CLI (CDP automation) has been validated: a Bun script successfully uploads images to remove.bg, waits for processing, captures the result from the correct Konva.js canvas layer (canvas[3] = transparent bg result), and saves locally. The test script is at `test-neo-removebg.ts`.

The extension has a 5-stage React UI (Sheet config → column selection → row preview → Drive config → processing with progress). Auth uses `chrome.identity` for Google Sheets/Drive APIs. This UI and auth layer remains unchanged.

## Goals / Non-Goals

**Goals:**
- Local Bun server handles image fetch + Neo remove.bg + resize
- Extension delegates processing via HTTP, keeps UI/auth/Drive/Sheets logic
- Auto-detect server availability before processing starts
- Clear error when server is not running

**Non-Goals:**
- Auto-starting the Neo server from the extension
- Replacing Google auth (chrome.identity stays)
- Changing the extension UI or stage flow
- Batch/parallel processing optimization (single sequential for now)

## Decisions

### 1. Bun HTTP server with two endpoints

**Decision**: Single `neo-server.ts` exposing `GET /health` and `POST /process`.

`/process` accepts `{ imageUrl, width, height }`, returns processed image as `image/png` binary.

**Why**: Simplest integration point. Extension just needs one `fetch()` call to replace the entire internal pipeline. No WebSocket, no streaming — request/response is sufficient for per-image processing.

**Alternative considered**: WebSocket for real-time progress updates per image. Rejected because the extension already tracks per-file status at the job level, and individual image processing (fetch + removebg + resize) takes 10-15s total — not long enough to need sub-step progress.

### 2. Neo CLI via child process

**Decision**: Server spawns `node ~/neo/tools/neo.cjs eval <js> --tab remove.bg` as child processes to interact with remove.bg.

**Why**: Neo CLI is already proven in the test script. No need to import Neo internals or rewrite CDP logic. The CLI handles session management, tab targeting, and JS evaluation.

**Alternative considered**: Direct CDP WebSocket connection from the server (bypass Neo CLI). More efficient but requires reimplementing Neo's session/tab management. Not worth it for v1.

### 3. Canvas capture strategy for Konva.js

**Decision**: Find the result canvas by scanning all `<canvas>` elements for one with transparent corners + opaque center pixels. This is canvas[3] in current remove.bg DOM but we detect dynamically.

**Why**: remove.bg uses Konva.js with 5 canvas layers. Hardcoding index is fragile. The transparent-corner + opaque-center heuristic reliably identifies the background-removed result regardless of layer order changes.

### 4. Sharp for image resize

**Decision**: Use `sharp` npm package for resize + white canvas composition.

**Why**: `OffscreenCanvas` is not available in Bun/Node. Sharp is the standard high-performance image processing library, supports PNG transparency detection and JPEG output with quality control. Replicates the existing `image-resizer.ts` logic (detect object bounds via alpha, scale to fit, center on white canvas).

### 5. Tab reuse between requests

**Decision**: Keep one remove.bg tab open across multiple `/process` requests. Navigate to `/upload` for each new image rather than opening/closing tabs.

**Why**: Avoids tab creation overhead. The test script already proved that navigating to `remove.bg/upload` on an existing tab resets the upload form.

## Risks / Trade-offs

- **remove.bg DOM changes** → Canvas detection heuristic (transparent corners + opaque center) is more resilient than CSS selectors, but Konva.js structure changes could break it. Mitigation: screenshot + error logging for debugging.
- **Neo CLI must be installed** → Runtime dependency on `~/neo/tools/neo.cjs`. Mitigation: health endpoint checks for Neo availability and returns clear error.
- **Chrome + CDP must be running** → Server needs `neo start` first. Mitigation: server auto-starts Chrome via Neo on startup.
- **Sequential processing** → One image at a time through remove.bg. For 200 images this is ~50 min. Mitigation: acceptable for v1, parallel tabs can be added later.
- **Sharp dependency** → Adds native dependency. Mitigation: Bun handles sharp installation well on macOS.
