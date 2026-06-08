## Why

The extension's background removal pipeline currently automates remove.bg via content script injection and tab manipulation inside the Chrome extension context. This approach is fragile (breaks on DOM changes), limited by extension CSP, and tightly couples processing logic to the browser. Neo CLI (installed locally from github.com/4ier/neo) has been proven to handle the remove.bg automation reliably via CDP, running as an external process. Moving image processing to a local Bun server powered by Neo decouples the heavy work from the extension while keeping the existing UI, auth, and Google APIs intact.

## What Changes

- **New local server** (`neo-server.ts`): Bun HTTP server that accepts image URLs, fetches the image, removes background via Neo CLI + remove.bg, resizes onto white canvas, and returns the processed image blob.
- **Replace `image-pipeline.ts`**: Instead of calling `removeBackground()` + `resizeImage()` internally, call the local server via `POST /process`.
- **Auto-detect server**: Before processing, extension pings `GET /health` on the local server. If unreachable, show error with instructions to start the server.
- **Remove extension-side processing code**: Delete `background-remover.ts`, `image-resizer.ts`, `content/removebg-automation.ts`, and related REMOVEBG message handlers from service worker.
- **Add `sharp` for resize**: Server uses `sharp` instead of `OffscreenCanvas` (not available in Bun/Node).

## Capabilities

### New Capabilities
- `neo-processing-server`: Local Bun HTTP server that handles image fetch, background removal (via Neo CDP + remove.bg), and resize. Exposes `/health` and `/process` endpoints.
- `extension-server-bridge`: Extension-side logic to detect the local server, delegate image processing via HTTP, and handle errors when server is unavailable.

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **New files**: `neo-server.ts` (server entry point)
- **Modified files**: `src/services/image-pipeline.ts` (replace internal processing with HTTP call)
- **Deleted files**: `src/services/background-remover.ts`, `src/services/image-resizer.ts`, `src/content/removebg-automation.ts`
- **Modified files**: `src/background/service-worker.ts` (remove REMOVEBG handlers)
- **New dependency**: `sharp` (image processing in Bun)
- **Runtime dependency**: Neo CLI at `~/neo/tools/neo.cjs`, Chrome with CDP on port 9222
- **manifest.json**: Can remove `content_scripts` for remove.bg if no other content scripts remain
