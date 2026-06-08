## 1. Setup

- [x] 1.1 Install `sharp` dependency via `bun add sharp`
- [x] 1.2 Add server config constants (port, Neo CLI path, CDP URL) to a shared config file

## 2. Neo Processing Server

- [x] 2.1 Create `neo-server.ts` with Bun.serve() skeleton, CORS headers, and route handling for `/health` and `/process`
- [x] 2.2 Implement auto-start CDP: on server startup, check if Chrome CDP is reachable, run `neo start` + `neo connect` if not
- [x] 2.3 Implement `/health` endpoint: check Neo CLI exists + CDP reachable, return status JSON
- [x] 2.4 Implement Neo remove.bg automation: open/reuse tab, inject image base64 via file input/dropzone, wait for result canvas (transparent corners + opaque center heuristic), capture as PNG buffer
- [x] 2.5 Implement image resize with sharp: detect object bounds via alpha, scale to fit target dimensions (no upscale), center on white canvas, output PNG buffer
- [x] 2.6 Implement `/process` endpoint: validate request body, orchestrate fetch → removebg → resize → return image/png response
- [x] 2.7 Add error handling: timeout for remove.bg (90s), debug screenshot on failure, structured error JSON responses

## 3. Extension Bridge

- [x] 3.1 Create server health check utility in extension: `checkNeoServer()` that pings `/health` and returns status or error message
- [x] 3.2 Rewrite `image-pipeline.ts`: replace internal fetch+removebg+resize with single `POST /process` call to local server
- [x] 3.3 Add server check before processing starts in the job runner: call `checkNeoServer()`, show error UI if unavailable
- [x] 3.4 Update error handling in pipeline to map server HTTP errors to FileTask error/warning states

## 4. Cleanup

- [x] 4.1 Delete `src/services/background-remover.ts`
- [x] 4.2 Delete `src/services/image-resizer.ts`
- [x] 4.3 Delete `src/content/removebg-automation.ts` and related content script entries
- [x] 4.4 Remove REMOVEBG message handlers (REMOVEBG_REQUEST, REMOVEBG_PROCESS, REMOVEBG_DEBUG, REMOVEBG_TEST) from `src/background/service-worker.ts`
- [x] 4.5 Remove unused constants (REMOVEBG-related) from `src/shared/constants.ts`
- [x] 4.6 Update `src/manifest.json`: remove content_scripts for remove.bg if no longer needed

## 5. Test

- [ ] 5.1 Manual test: start server, open extension, run full pipeline (sheet → process → drive upload) with 2-3 images
- [ ] 5.2 Manual test: verify error shown when server is not running
- [x] 5.3 Cleanup test files (`test-neo-removebg.ts`, `neo-capture-canvas.js`, `debug-*.png`)
