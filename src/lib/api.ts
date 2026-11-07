
/*
 * Data layer. The server (server/routes/site.ts) answers:
 *   GET /api/pieces?category=CHAINS|PENDANTS|RINGS -> { pieces: PieceSummary[] }
 *   GET /api/pieces/:slug                          -> { piece: Piece }
 *   GET /api/players                               -> { players: Player[] }
 *   GET /api/players/:slug                         -> { player: Player }
 *   GET /api/boxes                                 -> { boxes: Box[] }
 *   POST /api/callback {name, phone, interest}     -> { ok: true }
 * When the API is unreachable, a local copy of the catalogue keeps the site readable.
 */

























/* ---------- Forms ---------- */

type SendResult = { ok: true } | { ok: false; error: string };

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

