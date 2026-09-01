"use client";

// ---------------------------------------------------------------
// Client-side image intake.
//
// With no upload endpoint yet, a picked file is decoded, downscaled
// on a canvas and kept as a data URL. Downscaling is not cosmetic:
// the avatar is persisted into the localStorage session, and a raw
// phone photo would blow the ~5 MB origin quota on its own.
//
// When the API arrives, `processImage` stays and only the storage
// changes — POST the resulting Blob instead of keeping the string.
// ---------------------------------------------------------------

/** SVG is excluded: it cannot be meaningfully rasterised here. */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

/** Guard on the *input* file, before any decoding work happens. */
export const MAX_INPUT_BYTES = 8 * 1024 * 1024;

export type ImageErrorCode = "TYPE" | "SIZE" | "DECODE";

export class ImageError extends Error {
  constructor(public code: ImageErrorCode) {
    super(code);
    this.name = "ImageError";
  }
}

export interface ProcessOptions {
  maxWidth: number;
  maxHeight: number;
  /** Re-encode at falling quality until the result fits under this. */
  maxBytes: number;
  quality?: number;
}

export const AVATAR_OPTIONS: ProcessOptions = {
  maxWidth: 256,
  maxHeight: 256,
  maxBytes: 120 * 1024,
  quality: 0.85,
};

export const PRODUCT_IMAGE_OPTIONS: ProcessOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  maxBytes: 400 * 1024,
  quality: 0.85,
};

function pickMimeType(): string {
  // WebP keeps alpha and encodes smaller than PNG; fall back where the
  // canvas encoder does not support it.
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp")
    ? "image/webp"
    : "image/png";
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the <img> path below.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new ImageError("DECODE"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Approximate decoded byte length of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return dataUrl.length;
  const base64 = dataUrl.slice(comma + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function processImage(
  file: File,
  options: ProcessOptions
): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new ImageError("TYPE");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError("SIZE");
  }

  const source = await decode(file);
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  if (!sourceWidth || !sourceHeight) throw new ImageError("DECODE");

  // Only ever scale down — upscaling a small image just wastes bytes.
  const scale = Math.min(
    1,
    options.maxWidth / sourceWidth,
    options.maxHeight / sourceHeight
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("DECODE");

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  if ("close" in source) source.close();

  const mime = pickMimeType();
  let quality = options.quality ?? 0.85;
  let dataUrl = canvas.toDataURL(mime, quality);

  // PNG ignores the quality argument, so only loop for lossy encoders.
  if (mime !== "image/png") {
    while (dataUrlBytes(dataUrl) > options.maxBytes && quality > 0.4) {
      quality -= 0.15;
      dataUrl = canvas.toDataURL(mime, quality);
    }
  }

  return dataUrl;
}

/** Human-facing size, used in the upload hint text. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
