import { create } from "zustand";
import type { JobState } from "../../shared/types";

interface JobStore {
  job: JobState;
  updateJob: (state: JobState) => void;
  resetJob: () => void;
}

const initialJobState: JobState = {
  status: "idle",
  totalFiles: 0,
  completedFiles: 0,
  failedFiles: 0,
  currentFile: null,
  files: [],
};

export const useJobStore = create<JobStore>((set) => ({
  job: { ...initialJobState },
  updateJob: (state) => set({ job: state }),
  resetJob: () => set({ job: { ...initialJobState } }),
}));
