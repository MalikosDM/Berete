/*
 * Where the files of the 3D models live. Today a folder of the project
 * (storage/models, outside git; MODELS_DIR to put it elsewhere). The rest of
 * the server only uses the functions below: to move the files to another
 * disk or to a storage service of the VPS, only this file changes.
 *
 *   storage/models/<model id>/original.<ext>   the file as sent, never changed
 *   storage/models/<model id>/full.glb         computers
 *   storage/models/<model id>/light.glb        phones
 *   storage/models/<model id>/poster.webp      still image of the saved view
 *   storage/uploads/<upload id>.part           a file being received, piece by piece
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.env.MODELS_DIR ?? "storage");
const MODELS = path.join(ROOT, "models");
const UPLOADS = path.join(ROOT, "uploads");

export const MODEL_FILES = ["full.glb", "light.glb", "poster.webp"] as const;
export type ModelFile = (typeof MODEL_FILES)[number];

const SAFE_ID = /^[a-z0-9-]{1,64}$/i;

function check(id: string): string {
  if (!SAFE_ID.test(id)) throw new Error("Bad id");
  return id;
}

export const storage = {
  /** The folder of a model, where the pipeline writes its versions. */
  folder(id: string): string {
    const dir = path.join(MODELS, check(id));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  },
  /** Path of one file of a model, for reading (null when missing). */
  file(id: string, name: string): string | null {
    const file = path.join(MODELS, check(id), path.basename(name));
    return fs.existsSync(file) ? file : null;
  },
  /** The original as sent: original.<ext>. */
  original(id: string): string | null {
    const dir = path.join(MODELS, check(id));
    if (!fs.existsSync(dir)) return null;
    const found = fs.readdirSync(dir).find((f) => f.startsWith("original."));
    return found ? path.join(dir, found) : null;
  },
  size(id: string, name: string): number {
    const file = this.file(id, name);
    return file ? fs.statSync(file).size : 0;
  },
  write(id: string, name: string, data: Buffer): void {
    fs.writeFileSync(path.join(this.folder(id), path.basename(name)), data);
  },
  /** Moves a received upload into a model, as its original. */
  adopt(uploadId: string, id: string, ext: string): string {
    const target = path.join(this.folder(id), "original." + ext);
    fs.renameSync(this.uploadPath(uploadId), target);
    return target;
  },
  /** Copies an existing file (the test model) into a model, as its original. */
  copyIn(source: string, id: string, ext: string): string {
    const target = path.join(this.folder(id), "original." + ext);
    fs.copyFileSync(source, target);
    return target;
  },
  remove(id: string): void {
    fs.rmSync(path.join(MODELS, check(id)), { recursive: true, force: true });
  },

  uploadPath(uploadId: string): string {
    fs.mkdirSync(UPLOADS, { recursive: true });
    return path.join(UPLOADS, check(uploadId) + ".part");
  },
  uploadSize(uploadId: string): number {
    const file = this.uploadPath(uploadId);
    return fs.existsSync(file) ? fs.statSync(file).size : -1;
  },
  appendUpload(uploadId: string, data: Buffer): number {
    const file = this.uploadPath(uploadId);
    fs.appendFileSync(file, data);
    return fs.statSync(file).size;
  },
  startUpload(uploadId: string): void {
    fs.writeFileSync(this.uploadPath(uploadId), Buffer.alloc(0));
  },
  removeUpload(uploadId: string): void {
    fs.rmSync(this.uploadPath(uploadId), { force: true });
  },
  /** Uploads left unfinished for more than a day. */
  cleanUploads(): void {
    if (!fs.existsSync(UPLOADS)) return;
    const old = Date.now() - 24 * 3600 * 1000;
    for (const f of fs.readdirSync(UPLOADS)) {
      const file = path.join(UPLOADS, f);
      if (fs.statSync(file).mtimeMs < old) fs.rmSync(file, { force: true });
    }
  },
};
