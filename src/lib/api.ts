/* The forms of the site: POST /api/contact and POST /api/callback (server/routes/site.ts). */

/** "server": the request was refused; "network": no answer. The page says it in its language. */
export type SendResult = { ok: true } | { ok: false; error: "server" | "network" };

async function postJson(url: string, body: Record<string, string>): Promise<SendResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? { ok: true } : { ok: false, error: "server" };
  } catch {
    return { ok: false, error: "network" };
  }
}

/** `language`: the language of the page, so the answer comes in it. */
export function requestCallback(data: { name: string; phone: string; interest?: string; language: string }): Promise<SendResult> {
  return postJson("/api/callback", { name: data.name, phone: data.phone, interest: data.interest ?? "", language: data.language });
}

export function sendMessage(data: { name: string; email: string; message: string; company: string; language: string }): Promise<SendResult> {
  return postJson("/api/contact", data);
}
