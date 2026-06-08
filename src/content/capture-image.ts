// Content script: captures the best quality URL from the right-clicked image element

function parseSrcset(srcset: string): string | null {
  const entries = srcset.split(",").map((s) => s.trim());
  let best = "";
  let bestWidth = 0;

  for (const entry of entries) {
    const parts = entry.split(/\s+/);
    const url = parts[0] ?? "";
    const descriptor = parts[1] ?? "";
    const width = parseInt(descriptor.replace("w", ""), 10) || 0;
    if (width > bestWidth) {
      bestWidth = width;
      best = url;
    }
  }
  return best || null;
}

function getBestImageUrl(element: HTMLImageElement): string {
  // Priority: currentSrc > largest srcset > data-src > src
  if (element.currentSrc && element.currentSrc !== element.src) {
    return element.currentSrc;
  }

  if (element.srcset) {
    const srcsetUrl = parseSrcset(element.srcset);
    if (srcsetUrl) return srcsetUrl;
  }

  if (element.dataset.src) {
    return element.dataset.src;
  }

  return element.src;
}

// Listen for message from background to capture the image
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CAPTURE_IMAGE") {
    // Find the element under the last right-click position
    // The background script will trigger this right after context menu click
    const lastRightClicked = document.querySelector(
      "[data-ext-right-clicked]"
    ) as HTMLImageElement | null;

    if (lastRightClicked) {
      const url = getBestImageUrl(lastRightClicked);
      lastRightClicked.removeAttribute("data-ext-right-clicked");
      sendResponse({ url });
    } else {
      // Fallback: use the srcUrl from context menu info (passed in message)
      sendResponse({ url: message.fallbackUrl ?? "" });
    }
  }
});

// Track right-clicked element
document.addEventListener(
  "contextmenu",
  (e) => {
    // Clear previous marker
    document
      .querySelectorAll("[data-ext-right-clicked]")
      .forEach((el) => el.removeAttribute("data-ext-right-clicked"));

    const target = e.target as HTMLElement;
    if (target instanceof HTMLImageElement) {
      target.setAttribute("data-ext-right-clicked", "true");
    }
  },
  true
);
