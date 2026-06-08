import { resolve } from "path";

export const SERVER_PORT = 3456;
export const NEO_CLI_PATH = resolve(process.env.HOME!, "neo/tools/neo.cjs");
export const CDP_URL = "http://localhost:9222";
export const CDP_PORT = 9222;
export const REMOVEBG_URL = "https://www.remove.bg/upload";
export const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const CHROME_CDP_PROFILE = resolve(process.env.HOME!, ".chrome-cdp");

export const REMOVEBG_TIMEOUT_MS = 90_000;
export const DEFAULT_RESIZE_WIDTH = 1000;
export const DEFAULT_RESIZE_HEIGHT = 650;
/** Max area for the subject on the base canvas (object scaled to fit inside, centered). */
export const SUBJECT_FIT_MAX_WIDTH = 600;
export const SUBJECT_FIT_MAX_HEIGHT = 440;
export const JPEG_QUALITY = 90;
