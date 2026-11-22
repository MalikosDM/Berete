/* The forms of the site: POST /api/contact and POST /api/callback (server/routes/site.ts). */

/**
 * "network": no answer; "too-large": the photos are too heavy together; "too-many": too many forms in a short time;
 * "invalid": the server refused what was written; "server": any other refusal. The page says it in its language.
 */
export type SendError = "server" | "network" | "too-large" | "too-many" | "invalid";
export type SendResult = { ok: true } | { ok: false; error: SendError };

async function postJson(url: string, body: Record<string, unknown>): Promise<SendResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: res.status === 413 ? "too-large" : res.status === 429 ? "too-many" : res.status === 400 ? "invalid" : "server" };
  } catch {
    return { ok: false, error: "network" };
  }
}

/** `language`: the language of the page, so the answer comes in it. */
export function requestCallback(data: { name: string; phone: string; interest?: string; language: string }): Promise<SendResult> {
  return postJson("/api/callback", { name: data.name, phone: data.phone, interest: data.interest ?? "", language: data.language });
}

/** A photo joined to a message: its name, its type and its content in base64 (made lighter in the browser first). */
export type MessagePhoto = { name: string; type: string; data: string };

/** `startedAt`: when the form was opened (a form sent at once is a robot's). */
export function sendMessage(data: { name: string; email: string; instagram: string; message: string; photos: MessagePhoto[]; company: string; startedAt: number; language: string }): Promise<SendResult> {
  return postJson("/api/contact", data);
}
