/*
 * The photos joined to the private correspondence (src/pages/Contact.tsx), made lighter in the browser before they leave:
 * 2048 px on their long side at most, in JPEG, about 0.3 to 1.5 MB each, so that six of them stay well under the limit of
 * the server (server/index.ts). The photos of an iPhone (HEIC) are read by Safari (iPhone and Mac) like the others; a
 * browser that cannot read them (Chrome or Firefox on a computer) sends the original when it is light enough.
 */

export const MAX_PHOTOS = 6;
/** The long side of a photo once made lighter. */
const MAX_SIDE = 2048;
/** A photo kept as it is (one the browser cannot read) is sent only under this size; the server takes up to 4 MB. */
const MAX_ORIGINAL = 3.8 * 1024 * 1024;
/** A photo made lighter stays under this size (else it is made smaller again). */
const TARGET = 1.6 * 1024 * 1024;

export type PreparedPhoto = { name: string; type: string; blob: Blob; preview: string | null };

const isHeic = (file: File) => /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

/** The type of a file, from its extension when the browser does not say it (HEIC on a computer). */
function typeOf(file: File): string {
  if (file.type) return file.type.toLowerCase();
  if (isHeic(file)) return "image/heic";
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  return "image/jpeg";
}

/** The picture of a file, upright (its orientation applied), or null when the browser cannot read it. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* try an image below */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** The name of a photo in JPEG ("IMG_0001.HEIC" -> "IMG_0001.jpg"). */
const asJpeg = (name: string) => (name.replace(/\.[^.]+$/, "") || "photo") + ".jpg";

/**
 * One photo made lighter: a JPEG (its preview from it); the original when the browser cannot read it and it is light
 * enough (no preview); null when it can be neither read nor sent.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto | null> {
  const picture = await decode(file);
  if (!picture) {
    const type = typeOf(file);
    if (file.size <= MAX_ORIGINAL && /^image\/(jpeg|png|webp|heic|heif)$/.test(type)) return { name: file.name, type, blob: file, preview: null };
    return null;
  }
  const width = "naturalWidth" in picture ? picture.naturalWidth : picture.width;
  const height = "naturalHeight" in picture ? picture.naturalHeight : picture.height;
  let side = MAX_SIDE;
  for (const quality of [0.85, 0.78, 0.72, 0.66]) {
    const scale = Math.min(1, side / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    // A photo with transparency (PNG) on white, as a JPEG has none.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(picture, 0, 0, canvas.width, canvas.height);
    const blob = await toBlob(canvas, quality);
    if (blob && (blob.size <= TARGET || quality === 0.66)) {
      if ("close" in picture) picture.close();
      return { name: asJpeg(file.name), type: "image/jpeg", blob, preview: URL.createObjectURL(blob) };
    }
    side = Math.round(side * 0.85);
  }
  if ("close" in picture) picture.close();
  return null;
}

/** The content of a file in base64 (without its "data:" prefix). */
export function base64Of(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error ?? new Error("read"));
    reader.readAsDataURL(blob);
  });
}
