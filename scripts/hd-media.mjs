/*
 * The high-resolution photos and videos sent by Yoni (Google Drive, November 2026), read by scripts/import-media.mjs
 * (section "hd") from BERETE_HD_DIR (default: the external disk, "Berete - Dossiers icloud"). The source files are only
 * read, never changed.
 *
 * One entry per output folder (public/media/hd/<dir>/): the folder of Yoni ("NN", its number) and the files kept, in
 * this order:
 *   "p7"  photo 07 of the folder ("NN Name - 07.jpg" in Photos/), written as p07.webp;
 *   "v1"  video 01 ("NN Name - video 01.mp4" in Videos/), written as v01.mp4 with its poster, silent;
 *   "f"   the video of the Fabrication/ folder, written as f.mp4.
 * draft: a folder of a draft (unpublished): its photos are kept smaller (1080 px wide).
 * The pieces use them by folder and name (src/data/pieces.ts, yoni()). Folders that match a piece removed from the
 * catalogue (20, the Jesus piece of Marcus Thuram) are not read. The names of the folders were given from the photos,
 * not by Yoni: the pieces made from folders that match no piece of the site are drafts, unpublished, to be named by him.
 */

/** Warm black and white, as the other photos of the atelier (no blue bench in the palette). */
export const WARM_BW = "format=gray,format=rgb24,colorchannelmixer=rr=1:gg=0.93:bb=0.82";

export const HD = [
  /* ---------- Pieces of the site ---------- */
  { dir: "kenan-yildiz-celebration-pendant", folder: "11", items: ["p7", "p6", "p2", "p3", "p1", "p4", "v1"] },
  { dir: "the-hand", folder: "12", items: ["p7", "p4", "p1", "p2", "p6", "p5", "p3", "v1"] },
  { dir: "kevin-schade-dragon-ball-pendant", folder: "13", items: ["p18", "p19", "p7", "p9", "p8", "p14", "p15", "p6", "p20", "p21"] },
  { dir: "the-safi-link", folder: "16", items: ["p7", "p3", "p2", "p4", "p5", "p6", "p1"] },
  { dir: "noah-okafor-octagon-pendant", folder: "17", items: ["p9", "p2", "p1", "p4", "p6", "p10", "p8", "p11"] },
  { dir: "angelo-stiller-as-pendant", folder: "18", items: ["p11", "p7", "p3", "p8", "p5", "p1", "p10", "p4", "p12", "v4"] },
  { dir: "malik-tillman-cross-pendant", folder: "21", items: ["p17", "p13", "p7", "p14", "p3", "p6", "p18", "p1", "p20", "v3"] },
  { dir: "michy-batshuayi-butterfly-chain", folder: "23", items: ["p54", "p68", "p62", "p74", "p65", "p57", "p69", "p66", "p60", "p17", "p76"] },
  { dir: "tulips-on-tour-medallion", folder: "24", items: ["p21", "p16", "p7", "p12", "p13", "p6", "p20", "p5", "p25", "v13"] },
  {
    dir: "campione-d-italia-2023-2024",
    folder: "25",
    items: ["p40", "p52", "p53", "p12", "p6", "p15", "p43", "p44", "p11", "p8", "p60", "p64", "p17", "p25", "p28", "p20", "p22"],
  },
  { dir: "marcus-thuram-ruby-t-necklace", folder: "26", items: ["p2", "p3", "p12", "p10", "p8", "p5", "p6", "p7", "p11", "p1", "v3"] },
  { dir: "marcus-thuram-t-serpent-pendant", folder: "27", items: ["p8", "p12", "p2", "p1", "p7", "p11", "p4", "p18", "v1", "v3"] },
  { dir: "marcus-thuram-t-serpent-pendant", folder: "08", items: ["p2"] },
  {
    dir: "vfb-stuttgart-dfb-pokal-2025",
    folder: "29",
    items: ["p17", "p13", "p14", "p15", "p16", "p20", "p6", "p11", "p12", "p18", "p19", "p22", "p7", "p4", "p5", "p8"],
  },
  { dir: "noah-okafor-jersey-pendant", folder: "32", items: ["p20", "p18", "p15", "p7", "p6", "p12", "p10", "p11", "p16", "p1", "p2", "p21"] },
  { dir: "noah-okafor-oka-pendant", folder: "34", items: ["p17", "p3", "p5", "p6", "p4", "p9", "p14", "p1", "p2", "p18", "v2"] },

  /* ---------- Boxes ---------- */
  // Not the full-page Goku artwork (13/03): the rights of the Dragon Ball visuals are still to be confirmed by Yoni.
  { dir: "boxes/dragon-ball-trunk", folder: "13", items: ["p1", "p2", "p4", "p5"] },
  { dir: "boxes/tulips-on-tour", folder: "24", items: ["p2", "p1", "p3", "p4"] },
  { dir: "boxes/signature-trunk", folder: "35", items: ["p1", "p2", "p3", "p4", "p5", "p6", "p8", "p9", "p10", "p7"] },

  /* ---------- The atelier: the opening film of /atelier (a true horizontal shot, on the bench) ---------- */
  { dir: "atelier", folder: "24", items: ["v12"], filter: WARM_BW },

  /* ---------- Drafts: folders that match no piece of the site (unpublished, to be named by Yoni) ---------- */
  { dir: "chaine-cubaine-glacee-or-rose", folder: "02", draft: true, items: ["p1", "p3", "p4", "p6"] },
  { dir: "chaine-cubaine-glacee-or-rose", folder: "01", draft: true, items: ["p2", "p4", "p6", "p7", "f"] },
  { dir: "chaine-tennis-2-rangs", folder: "03", draft: true, items: ["p1", "p2", "p3", "p4", "p5", "p6"] },
  { dir: "pendentif-initiales-de", folder: "04", draft: true, items: ["p7", "p1", "p4", "p2", "p3", "p5", "p6", "v2"] },
  { dir: "pendentif-croix-christ-or-rose", folder: "05", draft: true, items: ["p5", "p1", "p4", "p2", "p3", "p7", "p6", "v1", "v2"] },
  { dir: "croix-baguettes", folder: "06", draft: true, items: ["p12", "p9", "p11", "p5", "p4", "p8", "p6", "p10", "p3", "p1"] },
  { dir: "collier-or-rose-fermoir-croix", folder: "07", draft: true, items: ["p8", "p9", "p1", "p2", "p4", "p10", "p11", "p6", "p7", "p12"] },
  { dir: "chaine-diamants", folder: "09", draft: true, items: ["p1", "p2", "p3"] },
  { dir: "bague-eternity-diamants-ovales", folder: "10", draft: true, items: ["p1", "p2", "p3", "p4", "p5"] },
  { dir: "pendentif-nom-en-lettres", folder: "14", draft: true, items: ["p3", "p21", "p1", "p15", "p13", "p12", "p18", "p16", "p5", "p22", "v1"] },
  { dir: "bracelet-or-rose-brt-a-pics", folder: "15", draft: true, items: ["p10", "p11", "p6", "p2", "p13", "p3", "p4", "p18", "p17"] },
  { dir: "pendentif-tete-animal", folder: "19", draft: true, items: ["p10", "p8", "p5", "p4", "p2", "p9", "p6", "p3", "v1", "v2", "v7"] },
  { dir: "medaille-gravee-nathalie-jose", folder: "22", draft: true, items: ["p7", "p1", "p2", "p3", "p4", "p6", "p9", "p15", "p16", "v1"] },
  { dir: "chaine-cubaine-baguettes", folder: "30", draft: true, items: ["p3", "p1", "p6", "p7", "p8", "p9", "p11", "p2", "v1"] },
  { dir: "bracelet-tennis-baguettes-or-rose", folder: "31", draft: true, items: ["p11", "p10", "p3", "p4", "p5", "p6", "p7", "p9", "p8", "v1"] },
  { dir: "chaine-cubaine-glacee", folder: "33", draft: true, items: ["p2", "p1", "p3", "p4", "v1"] },
];
