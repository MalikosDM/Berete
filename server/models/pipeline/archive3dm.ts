/*
 * The object table of a .3dm, read before rhino3dm (26/11/2026). rhino3dm stops reading a file at the first object it
 * cannot read, and silently: everything after it is lost. A file of Yoni's designer (Rhino 6) had curves that stopped it
 * after its 16th object, so the 1 700 others, the whole jewel, were never read ("Aucune surface trouvée"). Only volumes
 * matter to the model: curves, dimensions, texts, points, hatches... are taken out of the bytes given to rhino3dm, and
 * counted. Nothing of the original file is changed.
 *
 * The archive (openNURBS): a 32-byte header "3D Geometry File Format" + version, then chunks: a type code (4 bytes) and
 * a length (8 bytes from version 50 on, 4 before); a type code with its high bit set holds its value in the length and
 * has no body. The object table holds one record per object; the first chunk of a record gives the object type.
 */

/** Type codes (opennurbs_3dm.h); bit 0x8000 says the chunk ends with a CRC, ignored here. */
const OBJECT_TABLE = 0x10000013;
const OBJECT_RECORD = 0x20000070;
const OBJECT_RECORD_TYPE = 0x82000071;
const SHORT = 0x80000000;

/** Object types kept (ON::object_type): surface, polysurface, mesh, block copy, SubD, extrusion. */
const VOLUMES = new Set([8, 16, 32, 4096, 262144, 1073741824]);
const TYPE_NAMES: Record<number, string> = { 1: "point", 2: "pointset", 4: "curve", 512: "annotation", 8192: "textdot", 32768: "detail", 65536: "hatch", 131072: "morph", 536870912: "clipplane" };

export type Pruned = {
  /** The file with only its volumes (or the original bytes when it could not be walked). */
  bytes: Uint8Array;
  /** Objects taken out, by kind (curve, annotation...). */
  dropped: Record<string, number>;
  /** Records of the object table kept (volumes and block copies); -1 when the file could not be walked. */
  kept: number;
  /** The number, in the original table, of each record kept: rhino3dm's object i comes from records[i]. */
  records: number[];
};

/**
 * The bytes of a .3dm with its drawings (curves, dimensions, texts...) taken out of the object table, and the records
 * numbered in `skip` (objects rhino3dm could not read).
 */
export function volumesOnly(input: Uint8Array, skip: ReadonlySet<number> = new Set()): Pruned {
  const original: Pruned = { bytes: input, dropped: {}, kept: -1, records: [] };
  const b = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (b.length < 40 || b.toString("latin1", 0, 23) !== "3D Geometry File Format") return original;
  const version = parseInt(b.toString("latin1", 24, 32).trim(), 10);
  if (!Number.isFinite(version)) return original;
  const wide = version >= 50;
  const head = wide ? 12 : 8;
  const lengthAt = (o: number) => (wide ? Number(b.readBigUInt64LE(o + 4)) : b.readUInt32LE(o + 4));
  const code = (o: number) => b.readUInt32LE(o) >>> 0;
  const isShort = (tc: number) => (tc & SHORT) !== 0;

  // The object table, among the tables of the file.
  let o = 32;
  let table: { at: number; body: number; end: number } | null = null;
  while (o + head <= b.length) {
    const tc = code(o);
    const length = isShort(tc) ? 0 : lengthAt(o);
    const end = o + head + length;
    if (end > b.length) return original;
    if (tc === OBJECT_TABLE) {
      table = { at: o, body: o + head, end };
      break;
    }
    if (tc === 0x00007fff) break; // end of file
    o = end;
  }
  if (!table) return original;

  const parts: Buffer[] = [b.subarray(0, table.body)];
  const dropped: Record<string, number> = {};
  const records: number[] = [];
  let record = 0;
  o = table.body;
  while (o + head <= table.end) {
    const tc = code(o);
    const end = o + head + (isShort(tc) ? 0 : lengthAt(o));
    if (end > table.end) return original;
    const isRecord = (tc & ~0x8000) >>> 0 === OBJECT_RECORD;
    let type: number | null = null;
    if (isRecord && end - o > head * 2 && code(o + head) === OBJECT_RECORD_TYPE) type = lengthAt(o + head);
    if (!isRecord) parts.push(b.subarray(o, end));
    else if (skip.has(record)) dropped.unreadable = (dropped.unreadable ?? 0) + 1;
    else if (type === null || VOLUMES.has(type)) {
      parts.push(b.subarray(o, end));
      records.push(record);
    } else {
      const name = TYPE_NAMES[type] ?? "other";
      dropped[name] = (dropped[name] ?? 0) + 1;
    }
    if (isRecord) record++;
    o = end;
  }
  const kept = records.length;
  delete dropped.unreadable;
  if (Object.keys(dropped).length === 0 && skip.size === 0) return { ...original, kept, records };
  parts.push(b.subarray(table.end));
  const out = Buffer.concat(parts);
  const length = out.length - (b.length - table.end) - table.body;
  if (wide) out.writeBigUInt64LE(BigInt(length), table.at + 4);
  else out.writeUInt32LE(length, table.at + 4);
  return { bytes: new Uint8Array(out.buffer, out.byteOffset, out.byteLength), dropped, kept, records };
}
