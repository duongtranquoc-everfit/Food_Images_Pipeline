## 1. Project Setup & Dependencies

- [x] 1.1 Install new dependencies: `@imgly/background-removal`
- [x] 1.2 Update manifest.json: add `oauth2` config with client ID and scopes, add `contextMenus` and `activeTab` permissions, add `offscreen` permission
- [x] 1.3 Create offscreen.html for background removal processing
- [x] 1.4 Update build.ts to bundle offscreen document entry point

## 2. Google OAuth Service

- [x] 2.1 Create `src/services/google-auth.ts`: getAuthToken, removeCachedToken, signOut, token refresh on 401
- [x] 2.2 Create `src/services/google-api.ts`: authenticated fetch wrapper that auto-attaches Bearer token and handles 401 retry

## 3. Google Sheets Service

- [x] 3.1 Create `src/services/sheets.ts`: parseSheetUrl (extract spreadsheet ID), getSheetMetadata (title, tabs), getSheetData (rows from specific tab and columns)
- [x] 3.2 Implement column header fetching for dropdown population

## 4. Image Selection — Context Menu & Content Script

- [x] 4.1 Register context menu "Use this image" in service worker (type: "image")
- [x] 4.2 Create `src/content/capture-image.ts`: content script that captures right-clicked element and extracts best URL (currentSrc > srcset largest > data-src > src)
- [x] 4.3 Wire context menu click → inject content script → extract URL → send to side panel via messaging
- [x] 4.4 Update shared message types for IMAGE_CAPTURED event

## 5. Background Removal Service

- [x] 5.1 Create `src/offscreen/offscreen.html` and `src/offscreen/offscreen.ts` entry point
- [x] 5.2 Implement background removal in offscreen document using `@imgly/background-removal`
- [x] 5.3 Create `src/services/background-remover.ts`: manages OffscreenDocument lifecycle (create/reuse), sends image data, receives transparent result
- [x] 5.4 Add model download progress reporting via messaging
- [x] 5.5 Implement fallback: if removal fails, return original image with warning flag

## 6. Updated Image Processing Pipeline

- [x] 6.1 Update `src/services/image-resizer.ts`: accept user-specified width/height (no longer from constants), integrate with background removal output (transparent PNG → detect bounds → white canvas)
- [x] 6.2 Create `src/services/image-pipeline.ts`: orchestrates full per-image flow: fetch → remove bg → resize → encode JPG
- [x] 6.3 Ensure sequential processing with per-image progress updates

## 7. Google Drive Upload Service

- [x] 7.1 Create `src/services/drive.ts`: parseFolderUrl (extract folder ID), validateFolder, uploadFile (multipart), setPublicPermission, getViewUrl
- [x] 7.2 Implement retry logic (1 retry on failure)
- [x] 7.3 Implement upload progress tracking (X/Y files)

## 8. Google Sheet Write-back Service

- [x] 8.1 Create `src/services/sheet-writer.ts`: fetchHeaderRow (for column dropdown), buildBatchUpdate (match by name, skip existing unless overwrite), executeBatchUpdate
- [x] 8.2 Implement duplicate name detection and warning
- [x] 8.3 Implement existing value protection (skip or overwrite based on toggle)

## 9. Pipeline State Persistence

- [x] 9.1 Create `src/services/pipeline-state.ts`: saveState, loadState, clearState using chrome.storage.local
- [x] 9.2 Define PipelineState type: stage number, sheet config, rows with per-row status, Drive folder ID, dimension config
- [x] 9.3 Integrate auto-save after: stage transitions, image captures, processing completion, upload completion

## 10. Side Panel UI — Dual Mode & Layout

- [x] 10.1 Create mode tabs component: "Google Sheets Pipeline" | "Local CSV/XLSX"
- [x] 10.2 Move existing App.tsx local mode into `src/panel/modes/LocalMode.tsx`
- [x] 10.3 Create `src/panel/modes/PipelineMode.tsx` — container for 5-stage wizard
- [x] 10.4 Create stage indicator/stepper component showing stages 1-5 with active/completed/locked states
- [x] 10.5 Create resume prompt component: "Continue previous session?" with Resume/Start New buttons

## 11. Stage 1 UI — Sheet Connection

- [x] 11.1 Create `src/panel/components/pipeline/GoogleSignIn.tsx`: sign-in/sign-out button with auth status
- [x] 11.2 Create `src/panel/components/pipeline/SheetConfig.tsx`: Sheet URL input, tab dropdown, column mapping dropdowns, Load Data button
- [x] 11.3 Wire to sheets service: fetch metadata on URL enter, fetch data on confirm

## 12. Stage 2 UI — Image Selection

- [x] 12.1 Create `src/panel/components/pipeline/ImageSelectionTable.tsx`: scrollable table with row #, name, image URL/status, active row highlighting
- [x] 12.2 Wire context menu IMAGE_CAPTURED messages to fill active row and auto-advance
- [x] 12.3 Implement click-to-activate row (for editing/replacing URLs)
- [x] 12.4 Add "Done & Next Step" button with validation (at least 1 URL filled)

## 13. Stage 3 UI — Image Processing

- [x] 13.1 Create `src/panel/components/pipeline/ProcessingConfig.tsx`: width/height input modal with confirm button
- [x] 13.2 Create `src/panel/components/pipeline/ProcessingProgress.tsx`: progress bar, current file, per-file status list, pause/stop controls
- [x] 13.3 Wire to image-pipeline service with progress callbacks
- [x] 13.4 Store processed blobs in memory for Stage 4

## 14. Stage 4 UI — Drive Upload

- [x] 14.1 Create `src/panel/components/pipeline/DriveConfig.tsx`: folder URL input, validate button, start upload button
- [x] 14.2 Create `src/panel/components/pipeline/UploadProgress.tsx`: progress bar, per-file upload status
- [x] 14.3 Wire to drive service, collect URL mappings for Stage 5

## 15. Stage 5 UI — Sheet Write-back

- [x] 15.1 Create `src/panel/components/pipeline/WritebackConfig.tsx`: target column dropdown, overwrite toggle, write button
- [x] 15.2 Create `src/panel/components/pipeline/WritebackResult.tsx`: summary (X written, Y skipped, Z warnings), Done button
- [x] 15.3 Wire to sheet-writer service, clear pipeline state on completion

## 16. Service Worker Updates

- [x] 16.1 Update service-worker.ts: register context menu, handle image capture messages, manage OffscreenDocument lifecycle
- [x] 16.2 Add message routing for pipeline-specific messages (IMAGE_CAPTURED, BG_REMOVAL_REQUEST/RESULT, etc.)

## 17. Build & Integration Test

- [x] 17.1 Verify build produces valid dist/ with all new files (offscreen.html, content script)
- [ ] 17.2 Test Google OAuth sign-in flow
- [ ] 17.3 Test Sheet connection and data fetching
- [ ] 17.4 Test context menu image capture on various websites
- [ ] 17.5 Test background removal + resize pipeline
- [ ] 17.6 Test Drive upload and public sharing
- [ ] 17.7 Test Sheet write-back with name matching
- [ ] 17.8 Test pipeline state resume on extension reopen
- [ ] 17.9 End-to-end test: full 5-stage pipeline
