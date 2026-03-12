export const MSG = {
  START_JOB: "START_JOB",
  PAUSE_JOB: "PAUSE_JOB",
  RESUME_JOB: "RESUME_JOB",
  STOP_JOB: "STOP_JOB",
  PROGRESS_UPDATE: "PROGRESS_UPDATE",
  JOB_COMPLETE: "JOB_COMPLETE",
  JOB_ERROR: "JOB_ERROR",
} as const;

export const OUTPUT_FOLDER_NAME = "Images_Single_Ingredient";
export const RESIZE_WIDTH = 600;
export const RESIZE_HEIGHT = 600;
export const JPEG_QUALITY = 90;
export const FETCH_TIMEOUT_MS = 30_000;
