import { create } from "zustand";
import type { PipelineState, PipelineRow, PipelineStage, SheetConfig } from "../../shared/types";
import { DEFAULT_RESIZE_WIDTH, DEFAULT_RESIZE_HEIGHT } from "../../shared/constants";
import { savePipelineState } from "../../services/pipeline-state";

interface PipelineStore {
  state: PipelineState;
  authenticated: boolean;

  setAuthenticated: (v: boolean) => void;
  setStage: (stage: PipelineStage) => void;
  setSheetConfig: (config: SheetConfig) => void;
  setRows: (rows: PipelineRow[]) => void;
  updateRow: (index: number, updates: Partial<PipelineRow>) => void;
  setDriveFolderId: (id: string | null) => void;
  setDimensions: (width: number, height: number) => void;
  loadState: (state: PipelineState) => void;
  reset: () => void;
}

const defaultState: PipelineState = {
  stage: 1,
  sheetConfig: null,
  rows: [],
  driveFolderId: null,
  dimensions: { width: DEFAULT_RESIZE_WIDTH, height: DEFAULT_RESIZE_HEIGHT },
};

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  state: { ...defaultState },
  authenticated: false,

  setAuthenticated: (v) => set({ authenticated: v }),

  setStage: (stage) => {
    set((s) => ({ state: { ...s.state, stage } }));
    savePipelineState(get().state);
  },

  setSheetConfig: (config) => {
    set((s) => ({ state: { ...s.state, sheetConfig: config } }));
    savePipelineState(get().state);
  },

  setRows: (rows) => {
    set((s) => ({ state: { ...s.state, rows } }));
    savePipelineState(get().state);
  },

  updateRow: (index, updates) => {
    set((s) => {
      const rows = [...s.state.rows];
      const row = rows[index];
      if (row) rows[index] = { ...row, ...updates };
      return { state: { ...s.state, rows } };
    });
    savePipelineState(get().state);
  },

  setDriveFolderId: (id) => {
    set((s) => ({ state: { ...s.state, driveFolderId: id } }));
    savePipelineState(get().state);
  },

  setDimensions: (width, height) => {
    set((s) => ({ state: { ...s.state, dimensions: { width, height } } }));
  },

  loadState: (state) => set({ state }),

  reset: () => set({ state: { ...defaultState } }),
}));
