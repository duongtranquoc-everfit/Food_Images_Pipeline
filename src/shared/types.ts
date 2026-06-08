// === Local Mode Types (legacy) ===

export type JobStatus = "idle" | "running" | "paused" | "stopped" | "completed";

export type FileStatus =
  | "queued"
  | "downloading"
  | "removing-bg"
  | "resizing"
  | "saving"
  | "uploading"
  | "done"
  | "failed";

export interface FileTask {
  name: string;
  url: string;
  status: FileStatus;
  error?: string;
  warning?: string;
  driveUrl?: string;
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

// === Pipeline Mode Types ===

export type PipelineStage = 1 | 2 | 3 | 4 | 5;

export interface PipelineRow {
  name: string;
  imageUrl: string;
  status: FileStatus;
  processedBlob?: Blob;
  driveUrl?: string;
  error?: string;
  warning?: string;
}

export interface SheetConfig {
  url: string;
  spreadsheetId: string;
  tab: string;
  nameColIndex: number;
  headers: string[];
}

export interface PipelineState {
  stage: PipelineStage;
  sheetConfig: SheetConfig | null;
  rows: PipelineRow[];
  driveFolderId: string | null;
  dimensions: { width: number; height: number };
}
