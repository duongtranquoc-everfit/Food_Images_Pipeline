import type { JobConfig, JobState, FileTask } from "../shared/types";
import { MSG } from "../shared/constants";
import { broadcastToAll } from "../utils/messaging";
import { fetchImage } from "../services/image-fetcher";
import { resizeImage } from "../services/image-resizer";

type JobStatus = JobState["status"];

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  idle: ["running"],
  running: ["paused", "stopped", "completed"],
  paused: ["running", "stopped"],
  stopped: [],
  completed: [],
};

function canTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export class JobManager {
  private state: JobState = {
    status: "idle",
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    currentFile: null,
    files: [],
  };

  private abortController: AbortController | null = null;

  // Called from panel to write file — panel holds FileWriter (has DOM access)
  private onFileReady:
    | ((name: string, data: Uint8Array) => Promise<void>)
    | null = null;

  getState(): JobState {
    return { ...this.state };
  }

  setFileWriteHandler(
    handler: (name: string, data: Uint8Array) => Promise<void>
  ): void {
    this.onFileReady = handler;
  }

  async start(config: JobConfig): Promise<void> {
    // Reset state for new job
    this.state = {
      status: "running",
      totalFiles: config.files.length,
      completedFiles: 0,
      failedFiles: 0,
      currentFile: null,
      files: config.files.map((f) => ({
        name: f.name,
        url: f.url,
        status: "queued" as const,
      })),
    };

    this.abortController = new AbortController();
    this.broadcast();

    await this.processFiles();
  }

  pause(): void {
    if (canTransition(this.state.status, "paused")) {
      this.state.status = "paused";
      this.broadcast();
    }
  }

  resume(): void {
    if (canTransition(this.state.status, "running")) {
      this.state.status = "running";
      this.broadcast();
      this.processFiles();
    }
  }

  stop(): void {
    if (canTransition(this.state.status, "stopped")) {
      this.state.status = "stopped";
      this.abortController?.abort();
      this.state.currentFile = null;
      this.broadcast();
    }
  }

  private async processFiles(): Promise<void> {
    for (const file of this.state.files) {
      // Only process queued or failed files
      if (file.status !== "queued" && file.status !== "failed") continue;

      // Check for stop
      if (this.state.status === "stopped") break;

      // Check for pause — wait loop
      while (this.state.status === "paused") {
        await new Promise((r) => setTimeout(r, 300));
        if (this.state.status === "stopped") break;
      }
      if (this.state.status === "stopped") break;

      this.state.currentFile = file.name;

      try {
        // Step 1: Download
        this.updateFileStatus(file, "downloading");
        const imageData = await fetchImage(
          file.url,
          this.abortController!.signal
        );

        if (this.state.status === "stopped") break;

        // Step 2: Resize
        this.updateFileStatus(file, "resizing");
        const resizedData = await resizeImage(imageData);

        if (this.state.status === "stopped") break;

        // Step 3: Save
        this.updateFileStatus(file, "saving");
        if (this.onFileReady) {
          await this.onFileReady(file.name, new Uint8Array(resizedData));
        }

        this.updateFileStatus(file, "done");
        this.state.completedFiles++;
      } catch (err) {
        if (this.state.status === "stopped") break;

        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        file.error = errorMsg;
        this.updateFileStatus(file, "failed");
        this.state.failedFiles++;
      }

      this.broadcast();
    }

    // Final state
    if (this.state.status === "running") {
      this.state.status = "completed";
      this.state.currentFile = null;
      broadcastToAll({
        type: MSG.JOB_COMPLETE,
        payload: this.getState(),
      });
    }
  }

  private updateFileStatus(file: FileTask, status: FileTask["status"]): void {
    file.status = status;
    this.broadcast();
  }

  private broadcast(): void {
    broadcastToAll({
      type: MSG.PROGRESS_UPDATE,
      payload: this.getState(),
    });
  }
}
