## Context

New Chrome Extension project. No existing codebase. The extension automates downloading product images from CSV/XLSX files, resizing them to 600x600 with white padding, and saving to a local folder. Built for personal use with future shareability in mind.

Tech constraints: Chrome MV3, Side Panel API, Bun build tooling, React + Mantine v7 UI, Jimp for image processing, File System Access API for local file writing.

## Goals / Non-Goals

**Goals:**
- Fully functional image download + resize pipeline from CSV/XLSX input
- Non-blocking background processing with pause/resume/stop
- Clean service-based architecture that supports adding new input sources (Google Sheets), processors (watermark), and outputs (Google Drive)
- Single current job in state — lightweight memory footprint

**Non-Goals:**
- Google Sheets integration (future)
- Google Drive upload (future)
- Batch resize configuration (fixed 600x600 for now)
- Job history / persistence across browser restarts
- Multi-job concurrency (one job at a time)

## Decisions

### 1. Side Panel over Popup
**Choice**: Chrome Side Panel API
**Why**: Popup closes when user clicks away, losing UI state. Side Panel stays open alongside the page, ideal for long-running jobs with progress tracking.
**Alternative**: Popup — simpler but unusable for background monitoring.

### 2. File System Access API for output
**Choice**: `showDirectoryPicker()` → write files directly to user-chosen folder
**Why**: User gets files exactly where they want (e.g., Desktop), no zip extraction needed, files appear in real-time as they're processed.
**Alternative**: `chrome.downloads` API — no folder picker, files go to Downloads directory, Chrome may prompt per file.
**Alternative**: JSZip — requires user to extract, delays availability of files.

### 3. Jimp for image resize
**Choice**: Jimp browser build (~500KB)
**Why**: Pure JS, runs directly in Service Worker without DOM/Canvas/OffscreenDocument. Built-in contain() for fit-resize and composite() for white background padding.
**Alternative**: wasm-vips — better performance but 3MB, more complex setup.
**Alternative**: Canvas via OffscreenDocument — adds complexity (extra HTML page, message passing).

### 4. Service-based architecture with parser pattern
**Choice**: `services/parsers/` with `FileParser` interface, `services/` for processing pipeline
**Why**: Adding Google Sheets later = add one parser file implementing the same interface. Adding Google Drive = add one output service. No changes to existing code.
**Alternative**: Monolithic processing — faster to build but hard to extend.

### 5. Bun as build tool
**Choice**: Bun for bundling, package management, and build scripts
**Why**: Fast, single tool for everything, good TypeScript support.
**Alternative**: Vite/webpack — more ecosystem support but more config.

### 6. State management — only current job
**Choice**: Single `currentJob` in Zustand store, no job history
**Why**: Keeps memory usage low. Previous jobs are already saved as files on disk — no need to track them in state.
**Alternative**: Job history array — useful for retry but adds complexity and memory usage.

### 7. Job pause mechanism — checkpoint between files
**Choice**: Check `job.status` flag between each file in the processing loop. Use `AbortController` for immediate stop during active fetch.
**Why**: Simple, predictable. Each file is an atomic unit — either fully processed or not started.
**Alternative**: Web Workers — true threading but overkill for sequential file processing.

### 8. OffscreenDocument for Jimp in MV3
**Choice**: Use OffscreenDocument to run Jimp since Service Workers have limited APIs
**Why**: MV3 Service Workers cannot use some APIs Jimp may need. OffscreenDocument provides a DOM-like context while running in background. The panel sends data to SW, SW delegates to OffscreenDocument for resize, returns result.
**Fallback**: If Jimp works directly in SW (pure ArrayBuffer operations), skip OffscreenDocument.

## Risks / Trade-offs

- **[File System Access API browser support]** → Only works in Chromium browsers. Fine for Chrome Extension use case.
- **[Service Worker termination (MV3)]** → Chrome can kill SW after ~5min idle. Mitigation: SW stays active during processing via ongoing fetch/message activity. If killed mid-job, current job state is lost. Acceptable for MVP.
- **[Jimp performance on large images]** → Pure JS resize is slow (~500-2000ms/image). Mitigation: acceptable for batch processing, user sees per-file progress. Can upgrade to wasm-vips later if needed.
- **[CORS on image URLs]** → Extension with `host_permissions: ["<all_urls>"]` bypasses CORS. Non-issue.
- **[Large XLSX files]** → SheetJS parses entire file in memory. Mitigation: product sheets are typically small (<10K rows). Warn if file is very large.
