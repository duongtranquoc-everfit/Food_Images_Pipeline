export type JobStatus = "idle" | "running" | "paused" | "stopped" | "completed";

export type FileStatus =
  | "queued"
  | "downloading"
  | "resizing"
  | "saving"
  | "done"
  | "failed";

export interface FileTask {
  name: string;
  url: string;
  status: FileStatus;
  error?: string;
}

export interface JobState {
  status: JobStatus;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  currentFile: string | null;
  files: FileTask[];
}

export interface ParsedData {
  headers: string[];
  rows: string[][];
  sheetNames?: string[];
}

export interface JobConfig {
  files: Array<{ name: string; url: string }>;
}

export interface FileParser {
  canParse(file: File): boolean;
  parse(file: File, sheetName?: string): Promise<ParsedData>;
}
