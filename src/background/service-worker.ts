import { MSG } from "../shared/constants";

// Open side panel when extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

/** Last row index from pipeline panel (also mirrored in chrome.storage.session). */
let captureTargetRowIndex = 0;

chrome.runtime.onMessage.addListener(
  (message: { type: string; index?: number }) => {
    if (
      message.type === MSG.SET_CAPTURE_TARGET_ROW &&
      typeof message.index === "number"
    ) {
      captureTargetRowIndex = message.index;
    }
  }
);

// Register context menu for image selection
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "use-this-image",
    title: "Use this image",
    contexts: ["image"],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "use-this-image" || !tab?.id) return;

  // Stamp row index BEFORE any await so lag later cannot shift which row this URL belongs to.
  const stored = await chrome.storage.session.get("captureTargetRowIndex");
  if (typeof stored.captureTargetRowIndex === "number") {
    captureTargetRowIndex = stored.captureTargetRowIndex;
  }
  const rowIndexForCapture = captureTargetRowIndex;

  const fallbackUrl = info.srcUrl ?? "";

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["capture-image.js"],
    });

    const [response] = (await chrome.tabs.sendMessage(tab.id, {
      type: MSG.CAPTURE_IMAGE,
      fallbackUrl,
    })) as any[];

    const bestUrl = response?.url || fallbackUrl;

    chrome.runtime
      .sendMessage({
        type: MSG.IMAGE_CAPTURED,
        payload: { url: bestUrl, rowIndex: rowIndexForCapture },
      })
      .catch(() => {});
  } catch {
    chrome.runtime
      .sendMessage({
        type: MSG.IMAGE_CAPTURED,
        payload: { url: fallbackUrl, rowIndex: rowIndexForCapture },
      })
      .catch(() => {});
  }
});
