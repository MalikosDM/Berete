/*
 * The high-resolution photos and videos sent by Yoni (Google Drive, November 2026), read by scripts/import-media.mjs
 * (section "hd") from BERETE_HD_DIR (default: the external disk, "Berete - Dossiers icloud"). The source files are only
 * read, never changed.
 *
 * One entry per output folder (public/media/hd/<dir>/), from the folder of Yoni "NN" (folder):
 *   gallery  every photo and video shown by the piece, in their order: the first is its cover (the most beautiful), then
 *            the overall views, the details, the back and its engravings, worn, in its case. Each says what it shows
 *            (src/data/views.ts): "p7:front" = photo 07 ("NN Name - 07.jpg" in Photos/), a front view; "v15:film" = video
 *            15 ("NN Name - video 15.mp4" in Videos/, its "Videos HD/" original once it is whole), a silent loop of 12
 *            seconds at most; "07/p5:links" = photo 05 of folder 07 (copied as "07-p05").
 *   also     files used elsewhere by the piece (its making-of steps, its details, its handover), not in its gallery.
 *   items    (boxes, atelier) the files of a folder that is no piece: in this order.
 *   "f" is the video of the Fabrication/ folder; "v2@9:links" is the frame of video 02 at 9 s, kept as a photo.
 * The pieces use them by folder (src/data/pieces.ts: sorted() builds the cover and the gallery, yoni() one file).
 *
 * Sorted again on 20/11/2026, photo by photo and video by video (frames of every video), from the whole folder of each
 * piece: every distinct angle, detail and staging kept; left out: duplicates and near duplicates (the sharpest kept),
 * blurred or failed photos, screenshots and renders, workshop photos (they serve the making-of), faces of private people
 * (a footballer only when sure it is him), the anime artwork (rights of Dragon Ball not confirmed), the engraved first
 * names and dates of a private family (the back of the celestial medallion: shown since 21/11/2026, Yoni agrees), the
 * engraved date and time of the panther.
 * Later on 20/11/2026, the albums of Yoni (his captures): every piece of the folders is online but the 10 removed ones and the
 * tennis chain (03, crossed out by him). 07 ("Cross infinity", the chain) and 14 ("Bouzou", the pendant on it) are two
 * pieces (on 21/11/2026 Yoni said "Bouzou" is the pendant of Loïs Openda: one piece with his); 01 is his "14 mm cuban", 02 (+ 28/p07) his "Rose 20 mm cuban" (the thumbnails of his albums); 20 is his
 * "Jesus piece red ruby"; 30 is a piece of its own. Folder 28 holds only copies of other folders and one photo of the
 * chain of 02. Folder 31 holds one piece of its own (p08, p09) and the studio film of "BRT-Flower" (v02); the rest are
 * copies of 30 and single shots of chains found nowhere else.
 * Then on 20/11/2026, three new albums: 36 (BRT-Flower, photographed), 37 (the chain Sirius), 38 (the L pendant of Deniz
 * Undav); sorted the same way.
 */

/** Warm black and white, as the other photos of the atelier (no blue bench in the palette). */
export const WARM_BW = "format=gray,format=rgb24,colorchannelmixer=rr=1:gg=0.93:bb=0.82";

export const HD = [
  /* ---------- Pieces of the site ---------- */
  {
    dir: "kenan-yildiz-celebration-pendant",
    folder: "11",
    gallery: ["p7:front", "p6:angle", "p2:side", "p3:engraving", "p4:back", "p5:back", "p1:worn"]
  },
  {
    dir: "the-hand",
    folder: "12",
    gallery: ["p7:front", "p2:side", "p1:detail", "p6:setting", "p3:back", "p5:mark", "p4:hand"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the piece in its box (before its lid shows).
    also: ["v1@13.6"],
  },
  {
    dir: "kevin-schade-dragon-ball-pendant",
    folder: "13",
    gallery: ["p19:front", "p18:front", "p20:bust", "p14:detail", "p9:setting", "p11:detail", "p17:detail", "p16:detail", "p8:detail", "p15:side", "p10:light", "p12:light", "p6:back"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the raw piece, the setting, the polishing.
    also: ["p21", "v1@17.5", "v1@10"],
  },
  {
    dir: "the-safi-link",
    folder: "16",
    gallery: ["p6:bust", "p7:bust", "p3:detail", "p2:clasp", "p4:back", "p1:worn"],
  },
  {
    dir: "noah-okafor-octagon-pendant",
    folder: "17",
    gallery: ["p9:front", "p2:front", "p1:bust", "p8:bail", "p3:setting", "p6:setting", "p4:detail", "p5:detail", "p7:detail", "p10:back"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the setting, the raw piece, the polishing.
    also: ["p11", "v2@13", "v2@9"],
  },
  {
    dir: "angelo-stiller-as-pendant",
    folder: "18",
    gallery: ["p11:front", "p7:front", "p3:bust", "p2:bust", "v2:film", "p8:angle", "p4:bail", "p5:setting", "p9:detail", "p1:back", "p10:back"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the raw piece, the finished piece checked in gloves;
    // v04 shows the seats cut, no stone yet: its preparation of the setting (confirmed by Yoni, 21/11/2026).
    also: ["p12", "v3@3", "v4@2"],
  },
  {
    dir: "malik-tillman-cross-pendant",
    folder: "21",
    gallery: ["p17:front", "p6:bust", "p14:bail", "p13:detail", "p15:detail", "p7:setting", "p8:setting", "p16:setting", "p10:detail", "p11:detail", "p12:detail", "p9:detail", "p18:links", "p19:links", "p2:clasp", "p3:back", "p4:mark", "p5:links", "p1:worn"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the setting, the raw piece.
    also: ["v3", "v2@13.5"],
  },
  {
    dir: "michy-batshuayi-butterfly-chain",
    folder: "23",
    gallery: ["p54:bust", "p68:front", "p60:bust", "p59:side", "v15:film", "v9:film", "p63:detail", "p73:detail", "p74:setting", "p62:setting", "p70:detail", "p75:detail", "p72:setting", "p71:bail", "p56:detail", "p55:links", "p66:links", "p52:back", "p69:mark", "p20:worn", "p48:worn", "p22:worn", "p17:worn", "p41:worn", "v3:film"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the raw pendant, the chain in its trunk.
    also: ["p77", "v1@4.8"],
  },
  {
    dir: "tulips-on-tour-medallion",
    folder: "24",
    gallery: ["p22:front", "p21:angle", "v2:film", "p16:detail", "p19:detail", "p23:bail", "p20:bail", "p18:detail", "p13:detail", "p8:detail", "p7:detail", "p12:setting", "p10:setting", "p15:setting", "p11:detail", "p5:side", "p9:side", "p6:back", "p4:case", "p2:case", "p3:case", "p1:case"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): its scene set with its stones, before it goes into its frame;
    // its last adjustment at the bench (v13, confirmed by Yoni, 21/11/2026).
    also: ["p25", "v13@0.5"],
  },
  {
    dir: "campione-d-italia-2023-2024",
    folder: "25",
    gallery: ["p40:angle", "p55:front", "p13:angle", "p54:angle", "p56:angle", "p57:angle", "p49:angle", "p1:angle", "p41:angle", "p2:side", "v10:film", "p8:front", "p14:setting", "p52:detail", "p53:setting", "p48:detail", "p6:side", "p12:side", "p15:side", "p46:side", "p47:side", "p50:side", "p51:side", "p43:mechanism", "p45:mechanism", "p3:mechanism", "p4:mechanism", "p5:mechanism", "p44:mechanism", "p42:mechanism", "p10:inside", "p11:mark", "p60:whole", "p62:whole", "p61:whole", "p58:whole", "p59:whole", "p33:worn", "p64:hand", "p65:hand", "p66:hand", "p69:hand", "p20:case", "p22:case"],
    // Its details, and making-of steps (21/11/2026, frames of its films looked at one by one): the raw ring, the setting, the polishing.
    // 08/v25: baguettes set on its side (the same session as 08/v24 and 08/v26: confirmed by Yoni, 21/11/2026).
    also: ["p17", "p25", "p28", "v2@14.6", "v2@27.4", "v2@34.4", "08/v25@3"],
  },
  {
    dir: "marcus-thuram-ruby-t-necklace",
    folder: "26",
    gallery: ["p2:bust", "p1:bust", "p3:front", "p10:front", "p8:detail", "p9:detail", "p4:detail", "p6:links", "p7:links", "p11:links", "p12:detail", "p5:mark"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the setting, the raw piece, the polishing.
    also: ["v3", "v2@6.5", "v2@24"],
  },
  {
    dir: "marcus-thuram-t-serpent-pendant",
    folder: "27",
    gallery: ["p17:angle", "p8:front", "p18:front", "p10:angle", "v1:film", "p12:detail", "p9:detail", "p11:detail", "p1:detail", "p6:detail", "p2:setting", "p16:detail", "p3:setting", "p7:detail", "p15:setting", "p14:bail", "p13:setting", "p5:side", "p4:bail"],
    // 08/v19: the scales set one by one, the same as in its making-of 08/v14 (confirmed by Yoni, 21/11/2026).
    also: ["08/p2", "v3", "08/v19@2"],
  },
  {
    dir: "vfb-stuttgart-dfb-pokal-2025",
    folder: "29",
    gallery: ["p13:mechanism", "p20:front", "p17:angle", "p18:side", "p6:side", "p11:side", "p12:side", "p22:whole", "p1:whole", "p14:mechanism", "p15:detail", "p16:detail", "p21:detail", "p19:detail", "p8:whole", "p4:hand", "p5:hand"],
    // Its handover, and making-of steps (21/11/2026, frames of its films looked at one by one): the raw ring, the setting, the raw ring at the polishing wheel (08/v05, its making-of).
    also: ["p7", "08/v5@6", "08/v5@19", "08/v5@4.6"],
  },
  {
    dir: "noah-okafor-jersey-pendant",
    folder: "32",
    gallery: ["p16:front", "p20:whole", "p17:angle", "p2:bust", "v1:film", "p10:detail", "p18:detail", "p15:detail", "p11:setting", "p13:setting", "p12:setting", "p3:links", "p6:back", "p9:back", "p7:back", "p5:detail", "p4:detail", "p1:worn"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the raw piece, the setting, its trunk (32/v02, the film of its delivery).
    also: ["p21", "v2@21.2", "v2@12.2"],
  },
  {
    dir: "noah-okafor-oka-pendant",
    folder: "34",
    gallery: ["p5:front", "p17:angle", "p8:bail", "p10:bail", "p14:detail", "p3:detail", "p4:detail", "p9:detail", "p6:detail", "p16:detail", "p7:detail", "p13:side", "p1:worn", "p2:worn", "p18:case"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the raw piece, the setting, the polishing.
    also: ["v2@19.8", "v2@31.9", "v2@42.4"],
  },

  /* ---------- The pieces published on 20/11/2026 (the drafts of 19/11, named from their photos) ---------- */
  {
    dir: "rose-iced-cuban-chain",
    folder: "01",
    gallery: ["p1:angle", "p2:bust", "p5:links", "p4:links", "p6:links", "p3:clasp", "p7:back", "p8:back"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the raw chain, the setting, the polishing (its Fabrication film).
    also: ["f@2.6", "f@14.3", "f@24"],
  },
  {
    dir: "wide-rose-iced-cuban-chain",
    folder: "02",
    gallery: ["p1:bust", "p4:links", "28/p7:links", "p5:links", "p2:clasp", "p3:mark", "p6:back"],
  },
  {
    dir: "two-row-tennis-chain",
    folder: "03",
    gallery: ["p4:bust", "p1:bust", "p5:links", "p6:setting", "p2:links", "p3:setting"],
  },
  {
    dir: "ampersand-initials-pendant",
    folder: "04",
    gallery: ["p7:front", "p1:bust", "v2:film", "p3:angle", "p5:detail", "p4:detail", "p2:setting", "p6:bail"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the piece in its box.
    also: ["v2@19"],
  },
  {
    dir: "thorns-and-roses-crucifix",
    folder: "05",
    gallery: ["p5:front", "p4:angle", "p7:side", "p1:detail", "p3:detail", "p2:detail", "p6:back"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the model, the setting, the polishing.
    also: ["v2@0.8", "v2@20.5", "v2@27.5"],
  },
  {
    dir: "baguette-cross-pendant",
    folder: "06",
    gallery: ["p12:front", "p9:angle", "p4:setting", "p5:detail", "p11:detail", "p8:detail", "p10:bail", "p7:bail", "p3:back", "p2:back", "p1:mark"],
  },
  // Two albums of Yoni: the pendant "Bouzou" (14) and its chain "Cross infinity" (07; the clasp shots are in both folders).
  // "Bouzou" is the pendant of Loïs Openda (Yoni, 21/11/2026): its photos go to his piece.
  {
    dir: "lois-openda-script-pendant",
    folder: "14",
    gallery: ["p21:front", "p3:bust", "p15:angle", "p20:angle", "p16:side", "p17:side", "p1:detail", "p13:detail", "p19:detail", "p14:detail", "p18:bail", "p12:engraving"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the raw piece, its trunk.
    also: ["p22", "v1@1.2"],
  },
  {
    dir: "cross-infinity-chain",
    folder: "07",
    gallery: ["p9:bust", "p1:links", "p2:links", "14/p5:links", "p4:setting", "14/p10:setting", "p7:links", "p5:links", "14/p6:links", "p12:links", "p10:clasp", "p11:clasp", "p6:clasp"],
  },
  {
    dir: "pear-link-chain",
    folder: "09",
    gallery: ["p1:bust", "p2:links", "p3:setting"],
  },
  {
    dir: "oval-eternity-band",
    folder: "10",
    gallery: ["p2:angle", "p1:front", "p3:side", "p4:mark"],
  },
  {
    dir: "crown-of-thorns-jesus-piece",
    folder: "15",
    gallery: ["p12:front", "p11:angle", "p4:side", "p6:detail", "p2:detail", "p7:setting", "p9:bail", "p8:bail", "p3:bail", "p14:detail", "p5:detail", "p15:detail", "p16:light", "p18:back", "p1:back", "p17:mark"],
  },
  {
    dir: "panther-champion-pendant",
    folder: "19",
    gallery: ["p10:front", "p8:angle", "v3:film", "08/v8:film", "p5:detail", "p7:detail", "p4:detail", "p6:detail", "p9:back"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the setting, the raw piece, the polishing, its trunk (at 1 s, before the photograph of its lid);
    // confirmed by Yoni (21/11/2026): the panther set, the plates of its belt not yet on (08/v08 at 1 s: the assembly), the
    // LASANA plates (08/p01: the parts before the assembly).
    also: ["v8", "v1@5", "v1@21", "v2@1", "08/v8@1", "08/p1"],
  },
  {
    dir: "celestial-initial-medallion",
    folder: "22",
    // 21/11/2026: Yoni agrees to show its engraved back (its whole back, at an angle, its BRT mark); p05 shows the N with the
    // figure beside it. Left out: the close-ups of the first names (p11, p12, p13, p14: the same back, closer).
    gallery: ["p7:front", "p16:whole", "v7:film", "p1:detail", "p5:detail", "p8:detail", "p4:detail", "p3:setting", "p2:side", "p6:bail", "p9:bail", "p15:back", "p17:back", "p10:mark"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the finished piece checked in white gloves.
    also: ["v3@44.8"],
  },
  {
    dir: "two-tone-iced-cuban-chain",
    folder: "31",
    gallery: ["p8:bust", "p9:links"],
  },
  {
    dir: "white-iced-cuban-chain",
    folder: "33",
    gallery: ["p2:bust", "p3:links", "p1:mark"],
    also: ["p4", "v1"],
  },
  // Folder 30: the baguette Cuban chain (the chain the OKA pendant of Noah Okafor is shown on has the same links).
  {
    dir: "baguette-cuban-chain",
    folder: "30",
    gallery: ["p1:bust", "p5:bust", "p3:bust", "p2:side", "p8:links", "p7:links", "p6:setting", "p10:mark", "p11:back"],
  },
  // Folder 20: the album "Jesus piece red ruby" of Yoni (the Jesus piece once shown as Marcus Thuram's, removed then).
  {
    dir: "jesus-piece-red-flowers",
    folder: "20",
    gallery: ["p6:front", "p4:detail", "p1:detail", "p2:setting", "p7:setting", "p3:side", "p5:back"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the raw piece, the setting, the polishing.
    also: ["v1@19", "v1@30", "v1@40"],
  },
  // The album "BRT-Flower" of Yoni, photographed at last (folder 36, 20/11/2026): the chain on the bust, its flowers and
  // leaves, its links, its clasp signed BRT and the back of the clasp. Left out: p01 (a montage of the other photos), p08
  // (copy of p02), p09 and p10 (the same flower as p15, less sharp). The steps of its making: the flowers set in the red
  // cement (v04), the clasp finished at the bench (v05). The design of its chain is the one of the chain of Sirius (37).
  {
    dir: "brt-flower-chain",
    folder: "36",
    gallery: ["p4:bust", "p5:angle", "p12:links", "p15:setting", "p7:detail", "p6:detail", "p11:clasp", "p14:mark", "p13:links", "p2:detail", "p3:back"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the setting, the raw piece, the polishing (v05 was a bur on a raw link, not the polishing).
    also: ["v4", "v2@5", "v2@24.8"],
  },
  // The chain Sirius and its nameplate (folder 37, 20/11/2026): first the chain with its plate, the plate, its horned mask,
  // the flowers and links of the chain, its clasp, the trunk; then every angle of the plate (its letters of baguettes, its
  // masks, its edges), the back, the trunk and its case. Left out: p06 (p14 closer, less sharp), p07 (p21 wider, sharper);
  // p30 (the parts before assembly) is the raw step of its making, v05 its setting. Its film v03 (a short edit) in the
  // gallery; v01 is the same edit as its studio film v02; v04 (its delivery) shows the face of a private person.
  {
    dir: "sirius",
    folder: "37",
    gallery: ["p27:bust", "p28:front", "p18:detail", "p17:links", "p16:setting", "p22:clasp", "p2:case", "p23:setting", "p29:bust", "p24:bust", "p25:angle", "v3:film", "p20:detail", "p21:setting", "p14:setting", "p15:setting", "p8:setting", "p12:detail", "p19:detail", "p11:side", "p13:side", "p10:detail", "p9:links", "p26:back", "p5:back", "p1:case", "p3:case", "p4:case"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the parts before the assembly (v05 is a bur on the raw plate: no step of its own).
    also: ["p30"],
  },
  // The L pendant of Deniz Undav (folder 38, 20/11/2026): every photo (front, angles, the cherub, the setting, the bail,
  // the back with its pattern and the BRT mark). Its making-of: v01 (atelier), v02 the polishing (a step).
  {
    dir: "deniz-undav-l-pendant",
    folder: "38",
    gallery: ["p10:front", "p8:angle", "p4:detail", "p9:side", "p7:angle", "p3:setting", "p6:bail", "p1:back", "p5:setting", "p2:engraving"],
    // Its making-of steps (21/11/2026, frames of its films looked at one by one): the polishing, the raw piece, the setting.
    also: ["v2", "v1@2", "v1@15.4"],
  },

  // The Jesus piece of Samuel Ballet (no folder of its own): the frames of its making-of (08/v21) for its steps.
  { dir: "samuel-ballet-jesus-piece", folder: "08", also: ["v21@25.8", "v21@6.9", "v21@35.4"] },

  /* ---------- Boxes ---------- */
  // Not the full-page Goku artwork (13/03): the rights of the Dragon Ball visuals are still to be confirmed by Yoni.
  { dir: "boxes/dragon-ball-trunk", folder: "13", items: ["p1", "p2", "p4", "p5"] },
  { dir: "boxes/tulips-on-tour", folder: "24", items: ["p2", "p1", "p3", "p4"] },
  { dir: "boxes/signature-trunk", folder: "35", items: ["p1", "p2", "p3", "p4", "p5", "p6", "p8", "p9", "p10", "p7"] },

  /* ---------- The atelier: the opening film of /atelier (a true horizontal shot, on the bench) ---------- */
  { dir: "atelier", folder: "24", items: ["v12"], filter: WARM_BW },
];
