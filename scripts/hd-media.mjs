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
 *   "f" is the video of the Fabrication/ folder.
 * The pieces use them by folder (src/data/pieces.ts: sorted() builds the cover and the gallery, yoni() one file).
 *
 * Sorted again on 20/11/2026, photo by photo and video by video (frames of every video), from the whole folder of each
 * piece: every distinct angle, detail and staging kept; left out: duplicates and near duplicates (the sharpest kept),
 * blurred or failed photos, screenshots and renders, workshop photos (they serve the making-of), faces of private people
 * (a footballer only when sure it is him), the anime artwork (rights of Dragon Ball not confirmed), the engraved first
 * names and dates of a private family (the back of the celestial medallion), the engraved date and time of the panther.
 * The folders 07 (the chain of the script nameplate, same photos), 28 (copies of other folders and one photo of the
 * chain of 02) and 30 (the baguette Cuban chain of the OKA pendant of Noah Okafor: same links, same case) have no piece
 * of their own. 01 and 02 are two different chains (clasp, size of the links). Folder 31 holds one piece of its own
 * (p08, p09), the rest being copies of 30 and single shots of chains found nowhere else. Folder 20 (the Jesus piece of
 * Marcus Thuram, removed from the catalogue) is not read.
 */

/** Warm black and white, as the other photos of the atelier (no blue bench in the palette). */
export const WARM_BW = "format=gray,format=rgb24,colorchannelmixer=rr=1:gg=0.93:bb=0.82";

export const HD = [
  /* ---------- Pieces of the site ---------- */
  {
    dir: "kenan-yildiz-celebration-pendant",
    folder: "11",
    gallery: ["p7:front", "p6:angle", "p2:side", "p3:engraving", "p4:back", "p5:back", "p1:worn"],
  },
  {
    dir: "the-hand",
    folder: "12",
    gallery: ["p7:front", "p2:side", "p1:detail", "p6:setting", "p3:back", "p5:mark", "p4:hand"],
  },
  {
    dir: "kevin-schade-dragon-ball-pendant",
    folder: "13",
    gallery: ["p19:front", "p18:front", "p20:bust", "p14:detail", "p9:setting", "p11:detail", "p17:detail", "p16:detail", "p8:detail", "p15:side", "p10:light", "p12:light", "p6:back"],
    also: ["p21"],
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
    also: ["p11"],
  },
  {
    dir: "angelo-stiller-as-pendant",
    folder: "18",
    gallery: ["p11:front", "p7:front", "p3:bust", "p2:bust", "v2:film", "p8:angle", "p4:bail", "p5:setting", "p9:detail", "p1:back", "p10:back"],
    also: ["p12", "v4"],
  },
  {
    dir: "malik-tillman-cross-pendant",
    folder: "21",
    gallery: ["p17:front", "p6:bust", "p14:bail", "p13:detail", "p15:detail", "p7:setting", "p8:setting", "p16:setting", "p10:detail", "p11:detail", "p12:detail", "p9:detail", "p18:links", "p19:links", "p2:clasp", "p3:back", "p4:mark", "p5:links", "p1:worn"],
    also: ["v3"],
  },
  {
    dir: "michy-batshuayi-butterfly-chain",
    folder: "23",
    gallery: ["p54:bust", "p68:front", "p60:bust", "p59:side", "v15:film", "v9:film", "p63:detail", "p73:detail", "p74:setting", "p62:setting", "p70:detail", "p75:detail", "p72:setting", "p71:bail", "p56:detail", "p55:links", "p66:links", "p52:back", "p69:mark", "p20:worn", "p48:worn", "p22:worn", "p17:worn", "p41:worn", "v3:film"],
    also: ["p76"],
  },
  {
    dir: "tulips-on-tour-medallion",
    folder: "24",
    gallery: ["p22:front", "p21:angle", "v2:film", "p16:detail", "p19:detail", "p23:bail", "p20:bail", "p18:detail", "p13:detail", "p8:detail", "p7:detail", "p12:setting", "p10:setting", "p15:setting", "p11:detail", "p5:side", "p9:side", "p6:back", "p4:case", "p2:case", "p3:case", "p1:case"],
    also: ["p25", "v13"],
  },
  {
    dir: "campione-d-italia-2023-2024",
    folder: "25",
    gallery: ["p40:angle", "p55:front", "p13:angle", "p54:angle", "p56:angle", "p57:angle", "p49:angle", "p1:angle", "p41:angle", "p2:side", "v10:film", "p8:front", "p14:setting", "p52:detail", "p53:setting", "p48:detail", "p6:side", "p12:side", "p15:side", "p46:side", "p47:side", "p50:side", "p51:side", "p43:mechanism", "p45:mechanism", "p3:mechanism", "p4:mechanism", "p5:mechanism", "p44:mechanism", "p42:mechanism", "p10:inside", "p11:mark", "p60:whole", "p62:whole", "p61:whole", "p58:whole", "p59:whole", "p33:worn", "p64:hand", "p65:hand", "p66:hand", "p69:hand", "p20:case", "p22:case"],
    also: ["p17", "p25", "p28"],
  },
  {
    dir: "marcus-thuram-ruby-t-necklace",
    folder: "26",
    gallery: ["p2:bust", "p1:bust", "p3:front", "p10:front", "p8:detail", "p9:detail", "p4:detail", "p6:links", "p7:links", "p11:links", "p12:detail", "p5:mark"],
    also: ["v3"],
  },
  {
    dir: "marcus-thuram-t-serpent-pendant",
    folder: "27",
    gallery: ["p17:angle", "p8:front", "p18:front", "p10:angle", "v1:film", "p12:detail", "p9:detail", "p11:detail", "p1:detail", "p6:detail", "p2:setting", "p16:detail", "p3:setting", "p7:detail", "p15:setting", "p14:bail", "p13:setting", "p5:side", "p4:bail"],
    also: ["08/p2", "v3"],
  },
  {
    dir: "vfb-stuttgart-dfb-pokal-2025",
    folder: "29",
    gallery: ["p13:mechanism", "p20:front", "p17:angle", "p18:side", "p6:side", "p11:side", "p12:side", "p22:whole", "p1:whole", "p14:mechanism", "p15:detail", "p16:detail", "p21:detail", "p19:detail", "p8:whole", "p4:hand", "p5:hand"],
    also: ["p7"],
  },
  {
    dir: "noah-okafor-jersey-pendant",
    folder: "32",
    gallery: ["p16:front", "p20:whole", "p17:angle", "p2:bust", "v1:film", "p10:detail", "p18:detail", "p15:detail", "p11:setting", "p13:setting", "p12:setting", "p3:links", "p6:back", "p9:back", "p7:back", "p5:detail", "p4:detail", "p1:worn"],
    also: ["p21"],
  },
  {
    dir: "noah-okafor-oka-pendant",
    folder: "34",
    gallery: ["p5:front", "p17:angle", "p8:bail", "p10:bail", "p14:detail", "p3:detail", "p4:detail", "p9:detail", "p6:detail", "p16:detail", "p7:detail", "p13:side", "30/p1:angle", "30/p5:bust", "30/p3:angle", "30/p2:side", "30/v1:film", "30/p8:links", "30/p7:links", "30/p6:setting", "30/p10:mark", "30/p11:back", "p1:worn", "p2:worn", "p18:case"],
  },

  /* ---------- The pieces published on 20/11/2026 (the drafts of 19/11, named from their photos) ---------- */
  {
    dir: "rose-iced-cuban-chain",
    folder: "01",
    gallery: ["p1:angle", "p2:bust", "p5:links", "p4:links", "p6:links", "p3:clasp", "p7:back", "p8:back"],
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
  },
  {
    dir: "thorns-and-roses-crucifix",
    folder: "05",
    gallery: ["p5:front", "p4:angle", "p7:side", "p1:detail", "p3:detail", "p2:detail", "p6:back"],
  },
  {
    dir: "baguette-cross-pendant",
    folder: "06",
    gallery: ["p12:front", "p9:angle", "p4:setting", "p5:detail", "p11:detail", "p8:detail", "p10:bail", "p7:bail", "p3:back", "p2:back", "p1:mark"],
  },
  {
    dir: "script-nameplate-pendant",
    folder: "14",
    gallery: ["p21:front", "p3:bust", "07/p9:bust", "p15:angle", "p20:angle", "p16:side", "p17:side", "p1:detail", "p13:detail", "p19:detail", "p14:detail", "p18:bail", "p5:links", "07/p1:links", "07/p2:links", "p10:setting", "07/p4:setting", "p6:links", "07/p7:links", "07/p5:links", "p9:links", "p7:clasp", "p8:clasp", "07/p6:clasp", "p12:engraving"],
    also: ["p22"],
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
    also: ["v8"],
  },
  {
    dir: "celestial-initial-medallion",
    folder: "22",
    gallery: ["p7:front", "p16:whole", "v7:film", "p1:detail", "p8:detail", "p4:detail", "p3:setting", "p2:side", "p6:bail", "p9:bail"],
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

  /* ---------- Boxes ---------- */
  // Not the full-page Goku artwork (13/03): the rights of the Dragon Ball visuals are still to be confirmed by Yoni.
  { dir: "boxes/dragon-ball-trunk", folder: "13", items: ["p1", "p2", "p4", "p5"] },
  { dir: "boxes/tulips-on-tour", folder: "24", items: ["p2", "p1", "p3", "p4"] },
  { dir: "boxes/signature-trunk", folder: "35", items: ["p1", "p2", "p3", "p4", "p5", "p6", "p8", "p9", "p10", "p7"] },

  /* ---------- The atelier: the opening film of /atelier (a true horizontal shot, on the bench) ---------- */
  { dir: "atelier", folder: "24", items: ["v12"], filter: WARM_BW },
];
