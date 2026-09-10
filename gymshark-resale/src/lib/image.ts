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

// Supabase Storage image transforms: turn the public-object URL into a
// render/image URL so the CDN resizes on the fly. Requires the Pro plan.
// Non-Supabase URLs (e.g. external avatars) and already-transformed URLs
// are returned untouched so callers can pass any src through this helper.
const STORAGE_PUBLIC_SEGMENT = "/storage/v1/object/public/";
const STORAGE_RENDER_SEGMENT = "/storage/v1/render/image/public/";

export type StorageThumbOptions = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

export function storageThumb(
  url: string | null | undefined,
  options: StorageThumbOptions = {},
): string {
  if (!url) return "";
  if (!url.includes(STORAGE_PUBLIC_SEGMENT)) return url;

  const rendered = url.replace(STORAGE_PUBLIC_SEGMENT, STORAGE_RENDER_SEGMENT);
  const params = new URLSearchParams();
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.quality) params.set("quality", String(options.quality));
  if (options.resize) params.set("resize", options.resize);
  const qs = params.toString();
  return qs ? `${rendered}?${qs}` : rendered;
}
