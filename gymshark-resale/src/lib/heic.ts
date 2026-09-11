// Client-side HEIC/HEIF → JPEG conversion. iPhone photos are HEIC by default
// and desktop browsers (Chrome/Firefox/Edge) cannot render them at all —
// so listings uploaded from iPhone appeared blank on desktop. Convert at
// pick time so the preview, upload, and every future view all deal in JPEG.
//
// heic2any is loaded dynamically so the ~200 KB bundle only ships to users
// who actually add a HEIC file.

function isHeic(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return /\.(hei[cf])$/i.test(file.name);
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
    const newName = file.name.replace(/\.(hei[cf])$/i, ".jpg");
    const finalName = newName === file.name ? `${file.name.replace(/\.[^.]+$/, "")}.jpg` : newName;
    return new File([jpegBlob], finalName, { type: "image/jpeg", lastModified: file.lastModified });
  } catch (err) {
    // Fall back to the original file so the user still gets a chance to
    // upload (and desktop viewers see the same brokenness as before, not
    // worse). Log so we can spot when the library fails.
    console.error("[convertHeicToJpeg]", err);
    return file;
  }
}

export async function convertHeicFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => convertHeicToJpeg(f)));
}
