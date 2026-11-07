/* The forms of the site: POST /api/contact and POST /api/callback (server/routes/site.ts). */

export type SendResult = { ok: true } | { ok: false; error: string };

async function postJson(url: string, body: Record<string, string>): Promise<SendResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: "Something went wrong. Please try again or message us on WhatsApp." };
  } catch {
    return { ok: false, error: "Network error. Please try again or message us on WhatsApp." };
  }
}

export function requestCallback(data: { name: string; phone: string; interest?: string }): Promise<SendResult> {
  return postJson("/api/callback", { name: data.name, phone: data.phone, interest: data.interest ?? "" });
}

export function sendMessage(data: { name: string; email: string; message: string; company: string }): Promise<SendResult> {
  return postJson("/api/contact", data);
}
