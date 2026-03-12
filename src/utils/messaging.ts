import type { JobConfig, JobState } from "../shared/types";
import { MSG } from "../shared/constants";

export type Message =
  | { type: typeof MSG.START_JOB; payload: JobConfig }
  | { type: typeof MSG.PAUSE_JOB }
  | { type: typeof MSG.RESUME_JOB }
  | { type: typeof MSG.STOP_JOB }
  | { type: typeof MSG.PROGRESS_UPDATE; payload: JobState }
  | { type: typeof MSG.JOB_COMPLETE; payload: JobState }
  | { type: typeof MSG.JOB_ERROR; payload: { error: string } };

export function sendToBackground(msg: Message): void {
  chrome.runtime.sendMessage(msg);
}

export function onMessage(handler: (msg: Message) => void): () => void {
  const listener = (msg: Message) => handler(msg);
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

export function broadcastToAll(msg: Message): void {
  chrome.runtime.sendMessage(msg).catch(() => {});
}
