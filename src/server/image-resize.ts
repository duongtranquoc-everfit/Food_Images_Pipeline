import sharp from "sharp";
import {
  JPEG_QUALITY,
  DEFAULT_RESIZE_WIDTH,
  DEFAULT_RESIZE_HEIGHT,
  SUBJECT_FIT_MAX_WIDTH,
  SUBJECT_FIT_MAX_HEIGHT,
} from "./config";

const ALPHA_THRESHOLD = 10;

interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

function detectObjectBounds(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): Bounds {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasTransparency = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * channels + 3]!;
      if (alpha < ALPHA_THRESHOLD) {
        hasTransparency = true;
        continue;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!hasTransparency || minX > maxX || minY > maxY) {
    return { x: 0, y: 0, w: width, h: height };
  }

  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Places the subject on a white canvas: object is scaled to fit inside a box that is
 * (600×440) at base canvas (1000×650), scaling proportionally when canvas size changes.
 * Aspect ratio preserved; no enlargement beyond original crop; Lanczos for downscaling.
 */
export async function resizeImage(
  imageBuffer: Buffer,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer> {
  // Get raw pixel data with alpha channel
  const image = sharp(imageBuffer).ensureAlpha();
  const { width: origW, height: origH } = await image.metadata();

  if (!origW || !origH) {
    throw new Error("Cannot read image dimensions");
  }

  const rawData = await image.raw().toBuffer();
  const bounds = detectObjectBounds(rawData, origW, origH, 4);

  const subjectMaxW = Math.round(
    (targetWidth * SUBJECT_FIT_MAX_WIDTH) / DEFAULT_RESIZE_WIDTH
  );
  const subjectMaxH = Math.round(
    (targetHeight * SUBJECT_FIT_MAX_HEIGHT) / DEFAULT_RESIZE_HEIGHT
  );

  // Extract the object region, then fit inside subject box (same as hand-dragging to 600×440 on 1000×650)
  const { data: cropped, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .extract({ left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h })
    .resize(subjectMaxW, subjectMaxH, {
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .toBuffer({ resolveWithObject: true });

  const fitW = info.width;
  const fitH = info.height;

  const offsetX = Math.round((targetWidth - fitW) / 2);
  const offsetY = Math.round((targetHeight - fitH) / 2);

  return sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: cropped, left: offsetX, top: offsetY }])
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

/**
 * Recipe photo resize: scales the original image to fully cover the target box
 * (no white background, no letterboxing), then crops centered to the exact
 * target dimensions. Aspect ratio is preserved (no distortion); upscaling is
 * allowed when the source is smaller than the target.
 */
export async function resizeCoverCentered(
  imageBuffer: Buffer,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(targetWidth, targetHeight, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}
