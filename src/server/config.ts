import { resolve } from "path";

export const SERVER_PORT = 3456;

// --- Local InSPyReNet background-removal server (bg_server.py) ---
export const BG_SERVER_URL = process.env.BG_SERVER_URL || "http://127.0.0.1:7001";
export const BG_SERVER_TIMEOUT_MS = 60_000;
/** arm64 Python venv that has `transparent-background` + torch (MPS). */
export const BG_PYTHON = resolve(process.env.HOME!, "inspyrenet-env/bin/python");
export const BG_SERVER_SCRIPT = resolve(process.cwd(), "bg_server.py");
export const BG_MODE = process.env.BG_MODE || "base"; // "base" (best) | "fast"

// --- Resize / white-canvas compositing ---
export const DEFAULT_RESIZE_WIDTH = 1000;
export const DEFAULT_RESIZE_HEIGHT = 650;
/** Max area for the subject on the base canvas (object scaled to fit inside, centered). */
export const SUBJECT_FIT_MAX_WIDTH = 600;
export const SUBJECT_FIT_MAX_HEIGHT = 440;
export const JPEG_QUALITY = 90;
