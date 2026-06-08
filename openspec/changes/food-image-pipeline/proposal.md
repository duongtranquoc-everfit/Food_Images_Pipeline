## Why

The current extension only supports CSV/XLSX local file input and saves images to a local folder. The real workflow requires an end-to-end pipeline: reading food names from Google Sheets, manually selecting images via right-click on any webpage, removing backgrounds with ML, uploading processed images to Google Drive, and writing the Drive URLs back to the sheet. This eliminates hours of manual copy-paste work per batch of food items.

## What Changes

- **New: Google OAuth authentication** via `chrome.identity` for Sheets API + Drive API access
- **New: Google Sheet integration** — connect to a sheet, select tab, map columns for food name and image URL
- **New: Manual image selection via context menu** — right-click any image on any webpage → "Use this image" → captures best quality URL into the active row
- **New: Background removal** using `@imgly/background-removal` (browser-based ML) — removes background from ALL images before compositing onto white canvas
- **New: Configurable resize** — user specifies width × height before processing (no longer hardcoded)
- **New: Google Drive upload** — upload processed images to a user-specified Drive folder, set public sharing, collect file URLs
- **New: Write-back to Sheet** — batch-write Drive URLs to a user-selected column, matched by food name
- **New: Pipeline state persistence** — save current stage and progress to `chrome.storage.local` for resume on reopen
- **New: Dual mode** — keep existing CSV/XLSX local mode alongside the new Google Sheets pipeline mode
- **Modified: Image processing** — now includes background removal step before resize+white-canvas compositing; output format changed to JPG
- **BREAKING**: Extension permissions expanded (identity, Google API scopes, contextMenus, activeTab)

## Capabilities

### New Capabilities
- `google-auth`: OAuth2 authentication via chrome.identity for Google Sheets and Drive API scopes
- `sheet-connection`: Connect to Google Sheet by URL, select tab, map columns (name, image URL), fetch row data
- `image-selection`: Context menu "Use this image" on right-click, capture best-quality image URL (currentSrc > srcset > data-src > src), side panel table with active row management
- `background-removal`: ML-based background removal using @imgly/background-removal for all images, with fallback to original on failure
- `drive-upload`: Upload processed images to specified Google Drive folder, set public sharing permissions, collect file view URLs
- `sheet-writeback`: Batch-write Drive URLs back to a user-selected column in the sheet, matched by food name, safe for re-runs
- `pipeline-state`: Persist current pipeline stage and per-row progress to chrome.storage.local for resume capability

### Modified Capabilities
- `image-processing`: Now includes background removal before resize; output dimensions are user-configurable (not hardcoded); output format is JPG on white canvas
- `side-panel-ui`: Complete UI overhaul — multi-stage wizard with stage navigation, image selection table, processing config modal, upload config, write-back config

## Impact

- **Dependencies added**: `@imgly/background-removal` (~40MB model download on first use)
- **APIs**: Google Sheets API v4, Google Drive API v3, Chrome Identity API, Context Menus API
- **Permissions**: `identity`, `contextMenus`, `activeTab`, `storage`, `sidePanel`, host permissions for Google APIs + all URLs
- **OAuth Client ID**: `1049683790942-6csfgrnqvs23rl9asfai89qj1bp5nlmr.apps.googleusercontent.com`
- **Existing code**: CSV/XLSX local mode preserved as separate mode; image-resizer.ts modified to add background removal step
