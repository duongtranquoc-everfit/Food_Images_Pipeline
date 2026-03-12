import { useEffect } from "react";
import { MSG } from "../../shared/constants";
import type { Message } from "../../utils/messaging";
import { useJobStore } from "../store/job-store";

export function useMessaging(): void {
  const updateJob = useJobStore((s) => s.updateJob);

  useEffect(() => {
    const listener = (message: Message) => {
      switch (message.type) {
        case MSG.PROGRESS_UPDATE:
          updateJob(message.payload);
          break;
        case MSG.JOB_COMPLETE:
          updateJob(message.payload);
          break;
        default:
          break;
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [updateJob]);
}
