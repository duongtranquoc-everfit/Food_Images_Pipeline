## Context

Existing Chrome Extension (MV3) downloads images from CSV/XLSX, resizes to configurable dimensions with white background, saves locally via File System Access API. Built with Bun, React, Mantine v7, TypeScript. Side panel UI with Zustand state.

The upgrade adds a 5-stage pipeline: Google Sheet → manual image selection → background removal + resize → Drive upload → write URLs back. The existing local mode is preserved as a separate tab/mode.

OAuth Client ID: `1049683790942-6csfgrnqvs23rl9asfai89qj1bp5nlmr.apps.googleusercontent.com`

## Goals / Non-Goals

**Goals:**
- End-to-end pipeline from Google Sheet to processed images on Google Drive with URLs written back
- Manual image selection via context menu on any webpage
- ML-based background removal for all images (consistent output quality)
- Resume capability — reopen extension and continue from where you left off
- Keep existing CSV/XLSX local mode working

**Non-Goals:**
- Automatic image search (user manually finds images)
- Batch/concurrent background removal (sequential to avoid memory issues)
- Custom background colors (always white)
- Multi-user collaboration on the same sheet simultaneously

## Decisions

### 1. Pipeline architecture — wizard-style stages in side panel
**Choice**: Linear 5-stage wizard, each stage has its own UI panel. User advances explicitly.
**Why**: Clear mental model. Each stage has distinct config and confirmation. User controls pace.
**Alternative**: Single-page with all config upfront — too complex, stages have dependencies.

### 2. Google OAuth via chrome.identity
**Choice**: `chrome.identity.getAuthToken()` with `oauth2` section in manifest.json
**Why**: Simplest OAuth flow for Chrome Extensions. Token management handled by Chrome. User just clicks "Sign in" once.
**Scopes needed**: `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/drive.file`
**Alternative**: Manual OAuth flow — more complex, worse UX.

### 3. Context menu for image selection
**Choice**: `chrome.contextMenus.create()` with type "image" → content script extracts best URL → sends to side panel.
**Why**: Chrome provides `info.srcUrl` in context menu callback, but we also inject a content script to capture the actual right-clicked element and extract best quality from `currentSrc`, `srcset`, `data-src`.
**Flow**:
1. User right-clicks image → "Use this image" in context menu
2. Background script receives `info.srcUrl` as fallback
3. Content script (injected on demand) captures the right-clicked element
4. Content script extracts: `element.currentSrc || largest from srcset || element.dataset.src || element.src`
5. Best URL sent to side panel via messaging → fills active row

### 4. Background removal — @imgly/background-removal
**Choice**: `@imgly/background-removal` running in an OffscreenDocument
**Why**: Best browser-based ML solution. No API key needed. Runs ONNX model locally. Good quality on food images.
**OffscreenDocument needed because**: The library uses WebGL/WebGPU and Web Workers which aren't available in service workers. OffscreenDocument provides a full DOM context.
**Model loading**: ~40MB downloaded on first use, cached by browser. Show progress bar during download.
**Fallback**: If removal fails on a specific image, use original image (skip removal), mark as warning in UI.
**Alternative**: remove.bg API — better quality but requires API key and per-image cost.

### 5. Image processing pipeline (per image)
**Choice**: Sequential pipeline: fetch → remove background → resize + composite on white → encode JPG
**Steps**:
1. Fetch image from URL (already implemented)
2. Pass to @imgly/background-removal → get transparent PNG blob
3. createImageBitmap(transparent blob) → detect object bounds (reuse existing code)
4. Draw on white canvas at user-specified dimensions, centered
5. canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 })
**Why sequential**: Background removal is memory-intensive (~500MB per image). Running multiple in parallel would crash the extension.

### 6. Google Drive upload via REST API
**Choice**: Direct fetch to `https://www.googleapis.com/upload/drive/v3/files` with multipart upload
**Why**: Simple, no SDK needed. OAuth token from chrome.identity.
**Post-upload**: Set permission to `{ role: "reader", type: "anyone" }` via Drive permissions API.
**URL format**: `https://drive.google.com/file/d/${fileId}/view`
**Filename**: Keep original food name from sheet (e.g., "Chicken Breast (Grilled).jpg")

### 7. Sheet write-back — batch update
**Choice**: Collect all `{ name → driveUrl }` mappings, then single `spreadsheets.values.batchUpdate` call
**Why**: Fewer API calls, atomic operation. Match by name column value, not row index (safe if rows reorder).
**Safety**: Skip rows where target column already has value (unless user opts to overwrite). Log duplicate name warnings.

### 8. State persistence
**Choice**: `chrome.storage.local` — save pipeline stage, row data, and per-row status after each significant action
**What to persist**: current stage (1-5), sheet config, rows with their image URLs and processing status, Drive folder ID
**What NOT to persist**: image blobs (too large), OAuth tokens (managed by Chrome)
**Resume**: On extension open, check for saved state → offer "Continue" or "Start New"

### 9. Dual mode — tabs in side panel
**Choice**: Two tabs at top of side panel: "Google Sheets Pipeline" | "Local CSV/XLSX"
**Why**: Preserves existing functionality. User picks mode. Each mode is independent.

## Risks / Trade-offs

- **[@imgly/background-removal model size]** → ~40MB download on first use. Mitigation: show download progress, cache persists across sessions.
- **[Background removal quality on food images]** → ML model may not perfectly isolate food from plate/background. Mitigation: fallback to original image, user can see preview.
- **[Memory usage during background removal]** → ~500MB per image. Mitigation: process sequentially, not in parallel. Show clear progress.
- **[OffscreenDocument lifecycle]** → Chrome may close it. Mitigation: recreate on demand before each processing batch.
- **[Google API rate limits]** → Sheets: 300 req/min, Drive: 20,000 req/day. Mitigation: batch operations where possible. Typical batch is <100 images, well within limits.
- **[OAuth consent screen in Testing mode]** → Only test users can authenticate. Mitigation: add user's email as test user. Publish app when ready to share.
- **[Service worker termination during long operations]** → Mitigation: keep-alive via periodic chrome.runtime messages during processing. Heavy work runs in OffscreenDocument which has longer lifecycle.
