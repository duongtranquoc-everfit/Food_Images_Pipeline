import { processViaServer } from "./neo-server";

export interface PipelineOptions {
  width: number;
  height: number;
  skipBgRemoval?: boolean;
  recipeResize?: boolean;
  abortSignal?: AbortSignal;
  onStatus?: (status: string) => void;
}

export interface PipelineResult {
  blob: Blob;
  warning?: string;
}

export async function processImage(
  url: string,
  options: PipelineOptions
): Promise<PipelineResult> {
  const { width, height, skipBgRemoval, recipeResize, abortSignal, onStatus } = options;

  onStatus?.(recipeResize ? "resizing" : skipBgRemoval ? "resizing" : "removing-bg");

  const blob = await processViaServer(
    url,
    width,
    height,
    abortSignal,
    skipBgRemoval,
    recipeResize
  );

  return { blob };
}
