#!/usr/bin/env node
/* global process, Buffer, URL, setTimeout, console */
/**
 * A local stand-in of the OpenAI Images API for the tests of the AI Creation Studio, on the Mac only (never on the VPS, never
 * the real service: no key, no cost, no network). It answers the two calls the server makes (server/atelier/ai.ts) with a
 * small JPEG drawn here by sharp: a ring of metal on black, its colour from the words (yellow, white or rose gold), thicker
 * when the words ask for « bolder », and a different shade at each call (so two concepts never look the same).
 *   PORT=12112 node tests/support/fake-openai.mjs
 * The server of the site runs with OPENAI_API_KEY=sk-test-fake OPENAI_API_BASE=http://localhost:12112.
 *   POST /v1/images/generations   JSON { prompt, … }            -> { data: [{ b64_json }] }
 *   POST /v1/images/edits         multipart (prompt, image[] …)  -> the same
 *   A prompt that holds « REFUSE-ME » is refused as the safety system of the service does (400, moderation_blocked).
 *   GET  /calls                   every call received (endpoint, prompt, number of images sent), for the tests
 *   DELETE /calls                 forgets them
 * DELAY_MS (default 500): the time the « service » takes, so the page shows its waiting state.
 */
import http from "node:http";
import sharp from "sharp";

const PORT = Number(process.env.PORT || 12112);
const DELAY = Number(process.env.DELAY_MS ?? 500);
const calls = [];
let made = 0;

function json(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
}

const METALS = [
  [/rose gold/i, ["#9c5b4f", "#e8b4a0", "#b76e79"]],
  [/yellow gold/i, ["#8a6a1f", "#f2d27a", "#c9a24a"]],
  [/white gold/i, ["#6f7378", "#f1f1f1", "#b9bcc0"]],
];

async function picture(prompt) {
  made += 1;
  const [, colours] = METALS.find(([re]) => re.test(prompt)) ?? [null, ["#7a4a40", "#d9a48f", "#a8616b"]];
  const bold = /bolder|sculptural/i.test(prompt);
  const fine = /finer|delicate/i.test(prompt);
  const width = bold ? 70 : fine ? 16 : 36;
  const tilt = (made * 37) % 360;
  const glow = 40 + ((made * 23) % 60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <defs>
      <linearGradient id="m" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${tilt} .5 .5)">
        <stop offset="0" stop-color="${colours[0]}"/><stop offset=".5" stop-color="${colours[1]}"/><stop offset="1" stop-color="${colours[2]}"/>
      </linearGradient>
      <radialGradient id="g"><stop offset="0" stop-color="#3a2a26" stop-opacity=".${glow}"/><stop offset="1" stop-color="#0a0a0a" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="512" height="512" fill="#050505"/>
    <circle cx="256" cy="260" r="230" fill="url(#g)"/>
    <ellipse cx="256" cy="280" rx="140" ry="128" fill="none" stroke="url(#m)" stroke-width="${width}"/>
    <circle cx="256" cy="${150 - width / 3}" r="${26 + (made % 3) * 6}" fill="#f8f8ff" stroke="url(#m)" stroke-width="6"/>
    <circle cx="246" cy="${142 - width / 3}" r="6" fill="#ffffff" opacity=".9"/>
  </svg>`;
  return (await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer()).toString("base64");
}

/** The prompt and the number of images of a multipart body (read loosely: enough for a test). */
function readMultipart(body, type) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(type ?? "");
  const mark = "--" + (boundary?.[1] ?? boundary?.[2] ?? "");
  const text = body.toString("latin1");
  let prompt = "";
  let images = 0;
  for (const part of text.split(mark)) {
    const name = /name="([^"]+)"/.exec(part)?.[1];
    if (name === "prompt") prompt = Buffer.from(part.split("\r\n\r\n").slice(1).join("\r\n\r\n").replace(/\r\n$/, ""), "latin1").toString("utf8");
    if (name === "image[]" || name === "image") images += 1;
  }
  return { prompt, images };
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const body = Buffer.concat(chunks);
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/calls" && req.method === "GET") return json(res, 200, { calls });
    if (url.pathname === "/calls" && req.method === "DELETE") {
      calls.length = 0;
      return json(res, 200, { ok: true });
    }
    const generation = url.pathname === "/v1/images/generations" && req.method === "POST";
    const edit = url.pathname === "/v1/images/edits" && req.method === "POST";
    if (!generation && !edit) return json(res, 404, { error: { message: "Unknown route" } });
    if (!/^Bearer sk-/.test(req.headers.authorization ?? "")) return json(res, 401, { error: { code: "invalid_api_key", message: "Incorrect API key provided." } });
    let prompt;
    let images = 0;
    let model;
    if (generation) {
      try {
        const parsed = JSON.parse(body.toString("utf8"));
        prompt = String(parsed.prompt ?? "");
        model = String(parsed.model ?? "");
      } catch {
        return json(res, 400, { error: { message: "Bad JSON" } });
      }
    } else {
      ({ prompt, images } = readMultipart(body, req.headers["content-type"]));
      model = /name="model"\r\n\r\n([^\r]+)/.exec(body.toString("latin1"))?.[1] ?? "";
    }
    calls.push({ endpoint: generation ? "generations" : "edits", prompt, images, model, at: new Date().toISOString() });
    await new Promise((r) => setTimeout(r, DELAY));
    if (/REFUSE-ME/.test(prompt)) {
      return json(res, 400, { error: { code: "moderation_blocked", type: "image_generation_user_error", message: "Your request was rejected by the safety system." } });
    }
    json(res, 200, { created: Math.floor(Date.now() / 1000), data: [{ b64_json: await picture(prompt) }], usage: { total_tokens: 1056 } });
  });
});

server.listen(PORT, () => console.log("fake OpenAI on http://localhost:" + PORT));
