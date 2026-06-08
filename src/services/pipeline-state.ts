import type { PipelineState, PipelineRow } from "../shared/types";
import { DEFAULT_RESIZE_WIDTH, DEFAULT_RESIZE_HEIGHT } from "../shared/constants";

const STORAGE_KEY = "pipelineState";

// Serialize state without blobs (too large for storage)
interface SerializedPipelineState {
  stage: PipelineState["stage"];
  sheetConfig: PipelineState["sheetConfig"];
  rows: Array<Omit<PipelineRow, "processedBlob">>;
  driveFolderId: string | null;
  dimensions: { width: number; height: number };
}

export function getDefaultState(): PipelineState {
  return {
    stage: 1,
    sheetConfig: null,
    rows: [],
    driveFolderId: null,
    dimensions: { width: DEFAULT_RESIZE_WIDTH, height: DEFAULT_RESIZE_HEIGHT },
  };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingState: PipelineState | null = null;

function flushSave(): void {
  if (!pendingState) return;
  const state = pendingState;
  pendingState = null;
  const serialized: SerializedPipelineState = {
    stage: state.stage,
    sheetConfig: state.sheetConfig,
    rows: state.rows.map(({ processedBlob: _, ...rest }) => rest),
    driveFolderId: state.driveFolderId,
    dimensions: state.dimensions,
  };
  chrome.storage.local.set({ [STORAGE_KEY]: serialized });
}

export async function savePipelineState(
  state: PipelineState
): Promise<void> {
  pendingState = state;
  if (!saveTimer) {
    saveTimer = setTimeout(() => {
      saveTimer = null;
      flushSave();
    }, 2000);
  }
}

export async function loadPipelineState(): Promise<PipelineState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const saved = result[STORAGE_KEY] as SerializedPipelineState | undefined;
  if (!saved) return null;

  return {
    ...saved,
    rows: saved.rows.map((r) => ({ ...r, processedBlob: undefined })),
  };
}

export async function clearPipelineState(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
