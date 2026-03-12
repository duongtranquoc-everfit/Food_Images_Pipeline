import { MSG } from "../shared/constants";
import type { Message } from "../utils/messaging";
import { JobManager } from "./job-manager";

const jobManager = new JobManager();

// Open side panel when extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

// Message router
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    switch (message.type) {
      case MSG.START_JOB:
        jobManager.start(message.payload);
        sendResponse({ ok: true });
        break;

      case MSG.PAUSE_JOB:
        jobManager.pause();
        sendResponse({ ok: true });
        break;

      case MSG.RESUME_JOB:
        jobManager.resume();
        sendResponse({ ok: true });
        break;

      case MSG.STOP_JOB:
        jobManager.stop();
        sendResponse({ ok: true });
        break;

      default:
        break;
    }
    return false;
  }
);
