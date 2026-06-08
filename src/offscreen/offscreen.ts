import { removeBackground } from "@imgly/background-removal";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REMOVE_BG") {
    handleRemoveBg(message.payload.imageData as ArrayBuffer)
      .then((result) => sendResponse({ ok: true, data: result }))
      .catch((err) =>
        sendResponse({ ok: false, error: (err as Error).message })
      );
    return true; // keep channel open for async response
  }
});

async function handleRemoveBg(imageData: ArrayBuffer): Promise<ArrayBuffer> {
  const blob = new Blob([imageData], { type: "image/png" });
  const resultBlob = await removeBackground(blob, {
    progress: (key, current, total) => {
      chrome.runtime.sendMessage({
        type: "BG_REMOVAL_PROGRESS",
        payload: { key, current, total },
      });
    },
  });
  return await resultBlob.arrayBuffer();
}
