## 1. Project Setup

- [x] 1.1 Initialize Bun project with package.json, bunfig.toml, tsconfig.json
- [x] 1.2 Install dependencies: react, react-dom, @mantine/core, @mantine/hooks, @mantine/dropzone, jimp, xlsx, zustand
- [x] 1.3 Create build.ts script to bundle React app and service worker with Bun
- [x] 1.4 Create manifest.json (MV3, sidePanel, downloads, storage, host_permissions)
- [x] 1.5 Create project directory structure (src/panel, src/background, src/services, src/shared, src/utils, public/icons)
- [x] 1.6 Create extension icons (16, 48, 128)

## 2. Shared Types & Messaging

- [x] 2.1 Define shared types (JobState, FileTask, JobStatus, ParsedData, FileParser interface, message types)
- [x] 2.2 Implement type-safe messaging utilities (panel ↔ service worker communication)
- [x] 2.3 Define constants (message types, job statuses, file statuses, default config)

## 3. File Parsing Services

- [x] 3.1 Implement CSV parser (auto-detect delimiter, extract headers + rows)
- [x] 3.2 Implement XLSX parser using SheetJS (parse sheets, sheet selection, extract headers + rows)
- [x] 3.3 Create parser index with auto-detection by file extension
- [x] 3.4 Add file type validation (reject non-CSV/XLSX files)

## 4. Image Processing Services

- [x] 4.1 Implement image fetcher with timeout (30s) and AbortController support
- [x] 4.2 Implement image resizer using Jimp (fit 600x600, white background padding, center, JPEG output quality 90)
- [x] 4.3 Handle edge cases: small images (no upscale), square images, transparent PNGs

## 5. File Output Service

- [x] 5.1 Implement file writer using File System Access API (showDirectoryPicker, create subfolder, write files)
- [x] 5.2 Handle filename sanitization (replace invalid characters)
- [x] 5.3 Handle duplicate filenames (append number suffix)

## 6. Job Manager (Panel-based)

- [x] 6.1 Implement job state machine (idle → running → paused/stopped/completed, with valid transitions)
- [x] 6.2 Implement processing loop with pause checkpoint between files
- [x] 6.3 Implement stop with AbortController for immediate fetch cancellation
- [x] 6.4 Implement per-file status tracking (queued → downloading → resizing → saving → done/failed)
- [x] 6.5 Implement error resilience (skip failed files, continue processing, track failure count)
- [x] 6.6 Broadcast progress updates to panel via Zustand store

## 7. Service Worker Entry

- [x] 7.1 Create service-worker.ts with side panel registration
- [x] 7.2 Register side panel in service worker
- [x] 7.3 Wire up job manager to message handlers

## 8. Side Panel UI — Layout & Setup

- [x] 8.1 Create panel/index.html with React mount point and Mantine provider
- [x] 8.2 Create App.tsx with MantineProvider, main layout
- [x] 8.3 Create Zustand store for current job state (single job only)

## 9. Side Panel UI — Components

- [x] 9.1 Build FileUpload component (Mantine Dropzone, accept CSV/XLSX, drag-and-drop + click)
- [x] 9.2 Build DataPreview component (table preview of first few rows, highlight selected columns)
- [x] 9.3 Build ConfigForm component (sheet selector for XLSX, column dropdowns for URL and filename, folder picker button)
- [x] 9.4 Build JobCard component (progress bar, file counts, current file indicator)
- [x] 9.5 Build FileProgress component (scrollable list of files with status icons)
- [x] 9.6 Build job control buttons (Start, Pause, Resume, Stop, New Job — context-dependent)
- [x] 9.7 Build confirmation modals (stop job, new job while running)

## 10. Integration & Wiring

- [x] 10.1 Wire panel UI to service worker messaging (useMessaging hook)
- [x] 10.2 Wire file parsing results to config form
- [x] 10.3 Wire start button to send job config + parsed data to service worker
- [x] 10.4 Wire progress updates from service worker to Zustand store
- [x] 10.5 Wire pause/resume/stop buttons to service worker messages

## 11. Build & Test

- [x] 11.1 Verify Bun build produces valid dist/ folder loadable in Chrome
- [ ] 11.2 Test CSV parsing with various delimiters
- [ ] 11.3 Test XLSX parsing with single and multi-sheet files
- [ ] 11.4 Test image resize pipeline (landscape, portrait, square, small images)
- [ ] 11.5 Test job pause/resume/stop lifecycle
- [ ] 11.6 Test error handling (invalid URLs, timeout, invalid filenames)
- [ ] 11.7 End-to-end test: upload CSV → select columns → pick folder → start → verify output files
