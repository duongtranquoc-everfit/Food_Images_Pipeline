export const MSG = {
  // Local mode (legacy)
  START_JOB: "START_JOB",
  PAUSE_JOB: "PAUSE_JOB",
  RESUME_JOB: "RESUME_JOB",
  STOP_JOB: "STOP_JOB",
  PROGRESS_UPDATE: "PROGRESS_UPDATE",
  JOB_COMPLETE: "JOB_COMPLETE",
  JOB_ERROR: "JOB_ERROR",
  // Pipeline mode — side panel syncs selected row; SW stamps rowIndex on capture
  SET_CAPTURE_TARGET_ROW: "SET_CAPTURE_TARGET_ROW",
  IMAGE_CAPTURED: "IMAGE_CAPTURED",
  CAPTURE_IMAGE: "CAPTURE_IMAGE",
} as const;

export const OUTPUT_FOLDER_NAME = "Images_Single_Ingredient";
export const DEFAULT_RESIZE_WIDTH = 1000;
export const DEFAULT_RESIZE_HEIGHT = 650;
export const JPEG_QUALITY = 90;
export const FETCH_TIMEOUT_MS = 30_000;
