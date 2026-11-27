/*
 * The documents of The Private Atelier, as PDF (pdf-lib, standard fonts): the quotation, frozen when Berete sends it (its
 * SHA-256 kept in the base proves it never changed), and the receipt of each confirmed payment. Black on white, sober, the
 * name of the house at the top; English, the language of Berete's quotations. Kept in storage/atelier/<client>/<project>/.
 */
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatMoney } from "./money.js";
import { sha256 } from "./crypto.js";

const ROOT = path.resolve(process.env.MODELS_DIR ?? "storage", "atelier");
const SAFE = /^[a-z0-9-]{1,64}$/i;

function folder(clientId: string, projectId: string): string {
  if (!SAFE.test(clientId) || !SAFE.test(projectId)) throw new Error("Bad id");
  const dir = path.join(ROOT, clientId, projectId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const atelierFiles = {
  folder,
  path(clientId: string, projectId: string, name: string): string | null {
    if (!/^[a-z0-9.-]{1,80}$/i.test(name)) return null;
    const file = path.join(folder(clientId, projectId), name);
    return fs.existsSync(file) ? file : null;
  },
  write(clientId: string, projectId: string, name: string, data: Buffer | Uint8Array): string {
    if (!/^[a-z0-9.-]{1,80}$/i.test(name)) throw new Error("Bad name");
    const file = path.join(folder(clientId, projectId), name);
    fs.writeFileSync(file, data);
    return file;
  },
  removeClient(clientId: string): void {
    if (!SAFE.test(clientId)) return;
    fs.rmSync(path.join(ROOT, clientId), { recursive: true, force: true });
  },
};

const INK = rgb(0.04, 0.04, 0.04);
const MIST = rgb(0.42, 0.4, 0.38);
const ROSE = rgb(0.61, 0.36, 0.31);
const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;

/** Keeps only what the standard fonts can draw (WinAnsi): the rest becomes a near letter or goes. */
function ansi(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/\u00A0|\u202F/g, " ")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u20AC\u2022\u00B7]/g, "");
}

class Writer {
  page: PDFPage;
  y: number;
  constructor(
    private doc: PDFDocument,
    private regular: PDFFont,
    private bold: PDFFont,
  ) {
    this.page = doc.addPage(A4);
    this.y = A4[1] - MARGIN;
  }
  room(h: number) {
    if (this.y - h < MARGIN + 30) {
      this.page = this.doc.addPage(A4);
      this.y = A4[1] - MARGIN;
    }
  }
  text(value: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number; x?: number; width?: number } = {}) {
    const size = opts.size ?? 10.5;
    const font = opts.bold ? this.bold : this.regular;
    const width = opts.width ?? A4[0] - MARGIN * 2 - ((opts.x ?? MARGIN) - MARGIN);
    for (const para of ansi(value).split("\n")) {
      const words = para.split(/\s+/);
      let line = "";
      const lines: string[] = [];
      for (const w of words) {
        const next = line ? line + " " + w : w;
        if (font.widthOfTextAtSize(next, size) > width && line) {
          lines.push(line);
          line = w;
        } else line = next;
      }
      lines.push(line);
      for (const l of lines) {
        this.room(size * 1.5);
        this.page.drawText(l, { x: opts.x ?? MARGIN, y: this.y - size, size, font, color: opts.color ?? INK });
        this.y -= size * 1.45;
      }
    }
    this.y -= opts.gap ?? 4;
  }
  rule(gap = 10) {
    this.room(gap * 2);
    this.y -= gap / 2;
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: A4[0] - MARGIN, y: this.y }, thickness: 0.5, color: rgb(0.8, 0.78, 0.76) });
    this.y -= gap;
  }
  row(label: string, value: string, bold = false) {
    this.room(18);
    const size = 10.5;
    this.page.drawText(ansi(label), { x: MARGIN, y: this.y - size, size, font: this.regular, color: MIST });
    const font = bold ? this.bold : this.regular;
    const v = ansi(value);
    this.page.drawText(v, { x: A4[0] - MARGIN - font.widthOfTextAtSize(v, size), y: this.y - size, size, font, color: INK });
    this.y -= size * 1.9;
  }
  footer(text: string) {
    for (const p of this.doc.getPages()) p.drawText(ansi(text), { x: MARGIN, y: MARGIN - 20, size: 8, font: this.regular, color: MIST });
  }
}

async function start(title: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setAuthor("BERETE Jewellers");
  doc.setCreator("BERETE Private Atelier");
  doc.setProducer("BERETE");
  // A fixed date: the same document gives the same bytes (its fingerprint means its content).
  doc.setCreationDate(new Date(0));
  doc.setModificationDate(new Date(0));
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, regular, bold);
  w.text("BERETE", { size: 22, bold: true, gap: 0 });
  w.text("JEWELLERS · DUBAI", { size: 8, color: ROSE, gap: 18 });
  return { doc, w };
}

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai" });

export type QuotePdf = {
  number: number;
  projectTitle: string;
  clientName: string;
  version: string | null;
  materials: string;
  priceCents: number;
  feesCents: number;
  feesLabel: string;
  designFeeCents: number;
  currency: string;
  leadTime: string;
  schedule: string;
  terms: string;
  sentAt: Date;
};

export async function quotePdf(q: QuotePdf): Promise<{ data: Buffer; sha256: string }> {
  const { doc, w } = await start("Quotation Q" + q.number + " — " + q.projectTitle);
  w.text("QUOTATION Q" + q.number, { size: 15, bold: true, gap: 2 });
  w.text(q.projectTitle + " — for " + q.clientName, { size: 11, gap: 2 });
  w.text("Issued on " + day(q.sentAt) + (q.version ? " · Design " + q.version : ""), { size: 9.5, color: MIST, gap: 12 });
  w.rule();
  if (q.materials.trim()) {
    w.text("MATERIALS AND CHARACTERISTICS", { size: 9, bold: true, color: ROSE, gap: 4 });
    w.text(q.materials, { gap: 10 });
  }
  w.text("PRICE", { size: 9, bold: true, color: ROSE, gap: 6 });
  w.row("Final price", formatMoney(q.priceCents, q.currency));
  if (q.feesCents) w.row(q.feesLabel.trim() || "Applicable fees", formatMoney(q.feesCents, q.currency));
  w.row("Total", formatMoney(q.priceCents + q.feesCents, q.currency), true);
  if (q.designFeeCents) w.row("Professional design fee already paid, deducted", "- " + formatMoney(q.designFeeCents, q.currency));
  w.row("Remaining to pay", formatMoney(Math.max(0, q.priceCents + q.feesCents - q.designFeeCents), q.currency), true);
  w.rule();
  if (q.leadTime.trim()) {
    w.text("ESTIMATED MAKING AND DELIVERY", { size: 9, bold: true, color: ROSE, gap: 4 });
    w.text(q.leadTime, { gap: 10 });
  }
  if (q.schedule.trim()) {
    w.text("PAYMENT SCHEDULE", { size: 9, bold: true, color: ROSE, gap: 4 });
    w.text(q.schedule, { gap: 10 });
  }
  if (q.terms.trim()) {
    w.text("COMMERCIAL TERMS", { size: 9, bold: true, color: ROSE, gap: 4 });
    w.text(q.terms, { size: 9.5, gap: 10 });
  }
  w.footer("BERETE Jewellers · Quotation Q" + q.number + " · " + q.projectTitle);
  const data = Buffer.from(await doc.save({ useObjectStreams: false }));
  return { data, sha256: sha256(data) };
}

export type ReceiptPdf = {
  number: string;
  projectTitle: string;
  clientName: string;
  kind: string;
  amountCents: number;
  currency: string;
  paidAt: Date;
  method: string;
  quoteNumber: number;
  totalCents: number;
  creditedCents: number;
  remainingCents: number;
};

export async function receiptPdf(r: ReceiptPdf): Promise<{ data: Buffer; sha256: string }> {
  const { doc, w } = await start("Receipt " + r.number);
  w.text("PAYMENT RECEIPT " + r.number, { size: 15, bold: true, gap: 2 });
  w.text(r.projectTitle + " — " + r.clientName, { size: 11, gap: 2 });
  w.text("Confirmed on " + day(r.paidAt), { size: 9.5, color: MIST, gap: 12 });
  w.rule();
  w.row("Payment", r.kind);
  w.row("Amount received", formatMoney(r.amountCents, r.currency), true);
  if (r.method) w.row("Means", r.method);
  w.row("Quotation", "Q" + r.quoteNumber);
  w.rule();
  w.row("Total of the commission", formatMoney(r.totalCents, r.currency));
  w.row("Received so far (design fee included)", formatMoney(r.creditedCents, r.currency));
  w.row("Remaining to pay", formatMoney(r.remainingCents, r.currency), true);
  w.footer("BERETE Jewellers · Receipt " + r.number);
  const data = Buffer.from(await doc.save({ useObjectStreams: false }));
  return { data, sha256: sha256(data) };
}
