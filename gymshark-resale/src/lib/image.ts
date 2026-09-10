// Client-side image pipeline for uploads: HEIC → JPEG, then downscale +
// re-encode as JPEG so Storage never holds a 4 MB iPhone original when a
// 250 KB version looks identical in a browser. Cuts cached-egress bandwidth
// dramatically without touching the user flow.
//
// Both helpers are safe to call on any image the file picker returns —
// non-HEIC files skip the HEIC step, and files already under the cap still
// re-encode to strip metadata and standardize quality.

import { convertHeicToJpeg } from "@/lib/heic";

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(targetW, targetH)
      : Object.assign(document.createElement("canvas"), { width: targetW, height: targetH });

    const ctx = (canvas as OffscreenCanvas | HTMLCanvasElement).getContext("2d");
    if (!ctx) return file;
    (ctx as CanvasRenderingContext2D).drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const blob = "convertToBlob" in canvas
      ? await (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY })
      : await new Promise<Blob | null>((resolve) => {
          (canvas as HTMLCanvasElement).toBlob(resolve, "image/jpeg", JPEG_QUALITY);
        });
    if (!blob) return file;

    const jpegName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], jpegName, { type: "image/jpeg", lastModified: file.lastModified });
  } catch (err) {
    console.error("[compressImage]", err);
    return file;
  }
}

export async function prepareImageForUpload(file: File): Promise<File> {
  const jpeg = await convertHeicToJpeg(file);
  return compressImage(jpeg);
}

export async function prepareImagesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map(prepareImageForUpload));
}
