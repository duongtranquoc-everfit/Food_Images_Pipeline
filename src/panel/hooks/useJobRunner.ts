import { useRef, useCallback } from "react";
import { useJobStore } from "../store/job-store";
import { fetchImage } from "../../services/image-fetcher";
import { resizeImage } from "../../services/image-resizer";
import { FileWriter } from "../../services/file-writer";
import type { JobState, FileTask } from "../../shared/types";

/**
 * Runs the image processing pipeline directly in the panel context.
 * This is needed because:
 * - File System Access API (showDirectoryPicker) requires a user-gesture context (panel)
 * - Jimp needs ArrayBuffer processing which works fine in panel
 * - Service Worker in MV3 can be killed by Chrome at any time
 *
 * The panel manages the full pipeline: fetch → resize → save
 */
export function useJobRunner() {
  const updateJob = useJobStore((s) => s.updateJob);
  const statusRef = useRef<JobState["status"]>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const fileWriterRef = useRef<FileWriter>(new FileWriter());
  const jobStateRef = useRef<JobState | null>(null);

  const selectFolder = useCallback(async () => {
    const name = await fileWriterRef.current.selectFolder();
    return name;
  }, []);

  const broadcastState = useCallback(
    (state: JobState) => {
      jobStateRef.current = state;
      updateJob({ ...state });
    },
    [updateJob]
  );

  const updateFileStatus = useCallback(
    (state: JobState, fileIndex: number, status: FileTask["status"], error?: string) => {
      const file = state.files[fileIndex];
      if (!file) return;
      file.status = status;
      if (error) file.error = error;
      broadcastState(state);
    },
    [broadcastState]
  );

  const start = useCallback(
    async (files: Array<{ name: string; url: string }>) => {
      // Init output folder
      await fileWriterRef.current.initOutputFolder();

      const state: JobState = {
        status: "running",
        totalFiles: files.length,
        completedFiles: 0,
        failedFiles: 0,
        currentFile: null,
        files: files.map((f) => ({
          name: f.name,
          url: f.url,
          status: "queued" as const,
        })),
      };

      statusRef.current = "running";
      abortRef.current = new AbortController();
      broadcastState(state);

      // Process files
      for (let i = 0; i < state.files.length; i++) {
        const file = state.files[i]!;
        if (file.status !== "queued" && file.status !== "failed") continue;

        // Check stop
        if (statusRef.current === "stopped") break;

        // Check pause — wait loop
        while (statusRef.current === "paused") {
          await new Promise((r) => setTimeout(r, 300));
          if (statusRef.current === "stopped") break;
        }
        if (statusRef.current === "stopped") break;

        state.currentFile = file.name;

        try {
          // Download
          updateFileStatus(state, i, "downloading");
          const imageData = await fetchImage(file.url, abortRef.current.signal);

          if (statusRef.current === "stopped") break;

          // Resize
          updateFileStatus(state, i, "resizing");
          const resized = await resizeImage(imageData);

          if (statusRef.current === "stopped") break;

          // Save
          updateFileStatus(state, i, "saving");
          await fileWriterRef.current.writeFile(file.name, new Uint8Array(resized));

          updateFileStatus(state, i, "done");
          state.completedFiles++;
        } catch (err) {
          if (statusRef.current === "stopped") break;
          const msg = err instanceof Error ? err.message : "Unknown error";
          updateFileStatus(state, i, "failed", msg);
          state.failedFiles++;
        }

        broadcastState(state);
      }

      // Final state
      if (statusRef.current === "running") {
        state.status = "completed";
        state.currentFile = null;
        statusRef.current = "completed";
        broadcastState(state);
      }
    },
    [broadcastState, updateFileStatus]
  );

  const pause = useCallback(() => {
    statusRef.current = "paused";
    if (jobStateRef.current) {
      jobStateRef.current.status = "paused";
      broadcastState(jobStateRef.current);
    }
  }, [broadcastState]);

  const resume = useCallback(() => {
    statusRef.current = "running";
    if (jobStateRef.current) {
      jobStateRef.current.status = "running";
      broadcastState(jobStateRef.current);
    }
  }, [broadcastState]);

  const stop = useCallback(() => {
    statusRef.current = "stopped";
    abortRef.current?.abort();
    if (jobStateRef.current) {
      jobStateRef.current.status = "stopped";
      jobStateRef.current.currentFile = null;
      broadcastState(jobStateRef.current);
    }
  }, [broadcastState]);

  const reset = useCallback(() => {
    statusRef.current = "idle";
    abortRef.current = null;
    jobStateRef.current = null;
    fileWriterRef.current.reset();
  }, []);

  return { start, pause, resume, stop, reset, selectFolder, fileWriter: fileWriterRef };
}
