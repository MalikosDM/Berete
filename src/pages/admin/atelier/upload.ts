/*
 * Sending files from the admin of The Private Atelier, the same way as the follow-up of the clients (../ClientTracking.tsx):
 * a photo is made lighter in the browser, a video goes as it is (300 MB at most), both in pieces of a few MB (a piece that
 * fails is sent again); a 3D file (Rhino, GLB…) goes the way of the tab « Modèles 3D » (../Models3D.tsx); the attachments of
 * a message (photos, PDF: 10 MB each) in base64.
 */
import { base64Of, preparePhoto } from "@/lib/photos";
import { adminCall } from "../ui";

export const MAX_VIDEO = 300 * 1024 * 1024;
export const MAX_ATTACHMENT = 10 * 1024 * 1024;

export const mb = (bytes: number) => (bytes / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Mo";

/** A file sent in pieces to `base` (POST base → uploadId, PUT base/uploadId?offset=…). */
async function sendInPieces(token: string, base: string, blob: Blob, name: string, onSent: (bytes: number) => void): Promise<string> {
  const start = await adminCall(token, "POST", base, { name, size: blob.size });
  const uploadId = String(start.uploadId);
  const chunk = Number(start.chunkBytes) || 8 * 1024 * 1024;
  let offset = 0;
  let failures = 0;
  while (offset < blob.size) {
    const piece = blob.slice(offset, Math.min(blob.size, offset + chunk));
    const res = await fetch(base + "/" + uploadId + "?offset=" + offset, {
      method: "PUT",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/octet-stream" },
      body: piece,
    }).catch(() => null);
    if (res && (res.ok || res.status === 409)) {
      offset = Number(((await res.json()) as { received: number }).received);
      if (res.ok) failures = 0;
    } else {
      if (res && res.status === 401) throw new Error("expired");
      if (res && res.status === 413) throw new Error("Fichier trop lourd (300 Mo au plus pour une vidéo).");
      if (++failures > 4) throw new Error("L'envoi a échoué, vérifiez la connexion et recommencez.");
      await new Promise((r) => setTimeout(r, 1000 * failures));
    }
    onSent(offset);
  }
  return uploadId;
}

/** A photo or a video of the journal (the files of the client's news). */
export const sendClientFile = (token: string, clientId: string, blob: Blob, name: string, onSent: (bytes: number) => void) => sendInPieces(token, "/api/admin/clients/" + clientId + "/uploads", blob, name, onSent);

/** A 3D file: sent, then prepared by the server (its id; « queued » until it is ready). */
export async function sendModelFile(token: string, file: File, onSent: (fraction: number) => void): Promise<string> {
  const uploadId = await sendInPieces(token, "/api/admin/models/uploads", file, file.name, (bytes) => onSent(bytes / file.size));
  const done = await adminCall(token, "POST", "/api/admin/models/uploads/" + uploadId + "/complete", { name: file.name, size: file.size });
  return String(done.id);
}

/** The size of a video, read from its first bytes in the browser (null when it cannot say). */
export function videoSize(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const done = (size: { width: number; height: number } | null) => {
      window.clearTimeout(timer);
      v.removeAttribute("src");
      v.load();
      resolve(size);
    };
    const timer = window.setTimeout(() => done(null), 6000);
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => done(v.videoWidth && v.videoHeight ? { width: v.videoWidth, height: v.videoHeight } : null);
    v.onerror = () => done(null);
    v.src = url;
  });
}

export const isVideo = (f: File) => f.type.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(f.name);

/** A photo or a video ready to be sent to the journal (or why not). */
export type Picked = { key: string; kind: "image" | "video"; name: string; blob: Blob | null; preview: string | null; width: number | null; height: number | null; error: string | null };

export async function prepareJournalFile(file: File, keep: (url: string) => void): Promise<Partial<Picked>> {
  if (isVideo(file)) {
    if (file.size > MAX_VIDEO) return { error: "Trop lourde (" + mb(file.size) + ", 300 Mo au plus)." };
    const url = URL.createObjectURL(file);
    keep(url);
    const size = await videoSize(url);
    return { blob: file, preview: url, width: size?.width ?? null, height: size?.height ?? null };
  }
  const photo = await preparePhoto(file);
  if (!photo) return { error: "Photo illisible ou trop lourde." };
  if (photo.preview) keep(photo.preview);
  const bitmap = await createImageBitmap(photo.blob).catch(() => null);
  const ready = { blob: photo.blob, name: photo.name, preview: photo.preview, width: bitmap?.width ?? null, height: bitmap?.height ?? null };
  bitmap?.close();
  return ready;
}

/** An attachment of a message: a photo made lighter, a PDF as it is (10 MB at most each). */
export async function attachmentOf(file: File): Promise<{ name: string; mime: string; data: string; size: number } | string> {
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (pdf) {
    if (file.size > MAX_ATTACHMENT) return "« " + file.name + " » est trop lourd (10 Mo au plus).";
    return { name: file.name, mime: "application/pdf", data: await base64Of(file), size: file.size };
  }
  const photo = await preparePhoto(file);
  if (!photo) return "« " + file.name + " » n'est ni une photo lisible ni un PDF.";
  if (photo.blob.size > MAX_ATTACHMENT) return "« " + file.name + " » est trop lourd (10 Mo au plus).";
  if (photo.preview) URL.revokeObjectURL(photo.preview);
  return { name: photo.name, mime: photo.type, data: await base64Of(photo.blob), size: photo.blob.size };
}
