import {
  RESIZE_WIDTH,
  RESIZE_HEIGHT,
  JPEG_QUALITY,
} from "../shared/constants";

export async function resizeImage(imageBuffer: ArrayBuffer): Promise<Uint8Array> {
  // Decode image using browser's native decoder (supports PNG, JPG, WebP, GIF, etc.)
  const blob = new Blob([imageBuffer]);
  const bitmap = await createImageBitmap(blob);

  const origW = bitmap.width;
  const origH = bitmap.height;

  // Calculate fit dimensions (contain within 600x600, no upscale)
  const scale = Math.min(
    RESIZE_WIDTH / origW,
    RESIZE_HEIGHT / origH,
    1 // prevent upscaling
  );

  const fitW = Math.round(origW * scale);
  const fitH = Math.round(origH * scale);

  // Create canvas with white background
  const canvas = new OffscreenCanvas(RESIZE_WIDTH, RESIZE_HEIGHT);
  const ctx = canvas.getContext("2d")!;

  // Fill white background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, RESIZE_WIDTH, RESIZE_HEIGHT);

  // Center the image on canvas
  const offsetX = Math.round((RESIZE_WIDTH - fitW) / 2);
  const offsetY = Math.round((RESIZE_HEIGHT - fitH) / 2);
  ctx.drawImage(bitmap, offsetX, offsetY, fitW, fitH);

  bitmap.close();

  // Export as JPEG
  const outputBlob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: JPEG_QUALITY / 100,
  });

  return new Uint8Array(await outputBlob.arrayBuffer());
}
