## Why

Need a Chrome Extension to automate a repetitive workflow: downloading product images from URLs listed in CSV/XLSX files, resizing them to 600x600 with white padding (for e-commerce product listings), and saving them directly to a local folder. Currently this is done manually image by image.

## What Changes

- New Chrome Extension (Manifest V3) with Side Panel UI
- Upload CSV/XLSX files, auto-detect columns, let user pick URL and filename columns
- Background job processing: fetch images, resize to 600x600 with white background padding (fit, preserve aspect ratio) using Jimp
- Save processed images directly to a user-selected folder via File System Access API
- Job controls: pause, resume, stop with confirmation modal
- Per-file progress tracking and error handling (skip failed files, continue processing)
- Only current job held in state (no job history in memory)
- Built with React + Mantine v7 for UI, Bun for build tooling, TypeScript throughout
- Extensible architecture: parsers (CSV/XLSX now, Google Sheets later), processors (resize now, watermark/format later), outputs (local folder now, Google Drive later)

## Capabilities

### New Capabilities
- `file-parsing`: Parse CSV and XLSX files, extract headers and row data, support sheet selection for XLSX
- `image-processing`: Fetch images from URLs, resize to 600x600 with white background padding using Jimp, preserve aspect ratio
- `file-output`: Save processed images to user-selected local folder via File System Access API, create subfolder "Images_Single_Ingredient"
- `job-management`: Job state machine (idle/running/paused/stopped/completed), pause/resume/stop controls, per-file progress tracking, error resilience
- `side-panel-ui`: Chrome Side Panel with Mantine UI — file upload, column selection, data preview, job progress, confirmation modals

### Modified Capabilities
<!-- None - this is a new project -->

## Impact

- **New project**: Chrome Extension built from scratch
- **Dependencies**: React, Mantine v7, Jimp (browser build), SheetJS (xlsx), Bun, TypeScript
- **APIs**: Chrome Side Panel API, File System Access API, chrome.downloads (fallback)
- **Permissions**: sidePanel, downloads, storage, host_permissions for image fetching
