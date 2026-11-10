/*
 * The secret of the server: it signs the client sessions (/vip) and the
 * addresses of the 3D files. MODEL_SECRET when set, else a random value made
 * once and kept in the base (it survives restarts and password changes).
 */
import { randomBytes } from "node:crypto";
import { prisma } from "./db.js";

let secret: string | null = null;

export async function loadSecret(): Promise<void> {
  if (process.env.MODEL_SECRET) {
    secret = process.env.MODEL_SECRET;
    return;
  }
  const row = await prisma.serverSetting.findUnique({ where: { key: "secret" } });
  if (row) {
    secret = row.value;
    return;
  }
  const value = randomBytes(32).toString("hex");
  await prisma.serverSetting.create({ data: { key: "secret", value } });
  secret = value;
}

export function serverSecret(): string {
  if (!secret) throw new Error("The server secret is not loaded (loadSecret).");
  return secret;
}
