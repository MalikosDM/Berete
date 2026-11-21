/*
 * The films of "Enter the Atelier" (src/data/atelier.ts): for each piece, its making-of (the film of its fabrication)
 * and its finished piece ("The Final Reveal"). Read by scripts/import-media.mjs (section "films") from the folders of
 * Yoni (BERETE_HD_DIR, "Berete - Dossiers icloud"); the source files are only read, never changed.
 *
 * Each film is "NN/vMM" (folder NN, video MM) or "NN/f" (the video of its Fabrication/ folder). The best copy of it is
 * taken: the file of "Videos HD/" with the same number when there is one (the original in high quality, once whole:
 * readable, as long as its copy), else the file of "Videos/" without "(720p)", else its light "(720p)" copy. Since
 * 21/11/2026 every film of the site has its original in "Videos HD/" (folders 36, 37 and 38: already originals in
 * "Videos/"). Only the films chosen here count: the choice by the name of a file is dropped (the atelier names nearly all
 * its videos "…Craftsmanship…" or "…Final cut", finished piece and making-of alike: it took other films than these).
 *
 * Chosen by eye on 19/11/2026 (frames of every video): the professional edits first (studio light, 25 frames a second,
 * with music), a phone video only when nothing else exists and it is clean. Folder 08 ("Fabrication atelier (divers)")
 * holds the making-of of several pieces, recognised on their last shots (the finished piece): 08/v05 is the VfB film in
 * high quality (29/v02 is its light copy), 08/v14 ends on the T-Serpent, 08/v21 on the Jesus piece of Samuel Ballet.
 * Not used: the delivery videos (players, cars), the phone videos of the finished piece in a glove. Since 20/11/2026,
 * 08/v15 and 31/v02 are the films of "BRT-Flower" (an album of Yoni), 20 the films of his "Jesus piece red ruby".
 *
 * The finished piece ("reveal") also opens the page of the piece: the first thing seen when entering it
 * (src/components/PieceFilm.tsx). Checked again by eye on 20/11/2026, every video of the folders of the pieces (frames):
 * the most beautiful and sharpest edit of the finished piece of each (studio, on black, with music), never a making-of,
 * a delivery or a phone video. Folders 13 (Dragon Ball), 16 (The Safi Link) and 08 hold no edit of a finished piece of
 * the site; the pieces taken from the stories have no folder.
 *
 * folder: the folder of the piece itself (scripts/hd-media.mjs). A piece of the drafts (unpublished) gets the light copy
 * only. start: the second where a film begins, by kind, when its first seconds must not be shown. poster: the frame used
 * as its image by default (1 to 6), when the one found by the numbers (the sharpest well-lit) is not the best one to the
 * eye (all were looked at on 19/11/2026); the admin can choose another.
 */
export const FILMS = [
  /* ---------- Pieces of the site ---------- */
  { slug: "kevin-schade-dragon-ball-pendant", folder: "13", making: "13/v01" },
  { slug: "noah-okafor-octagon-pendant", folder: "17", making: "17/v02", reveal: "17/v01" },
  // No studio film of its fabrication: the polishing at the bench, filmed by phone (clean, close).
  { slug: "angelo-stiller-as-pendant", folder: "18", making: "18/v04", reveal: "18/v01" },
  { slug: "malik-tillman-cross-pendant", folder: "21", making: "21/v02", reveal: "21/v01" },
  // A horizontal phone video at the bench: the medallion put together, its wheels turning.
  { slug: "tulips-on-tour-medallion", folder: "24", making: "24/v12", reveal: "24/v01" },
  // Its image: the blue logo being set (recognisable at once).
  { slug: "campione-d-italia-2023-2024", folder: "25", making: "25/v02", reveal: "25/v01", poster: { making: 6 } },
  { slug: "marcus-thuram-ruby-t-necklace", folder: "26", making: "26/v02", reveal: "26/v01" },
  { slug: "marcus-thuram-t-serpent-pendant", folder: "27", making: "08/v14", reveal: "27/v02" },
  { slug: "vfb-stuttgart-dfb-pokal-2025", folder: "29", making: "08/v05", reveal: "29/v01" },
  // Its image: the baguettes being set (the sharpest frame by the numbers is a blurred polishing wheel).
  { slug: "noah-okafor-oka-pendant", folder: "34", making: "34/v02", reveal: "34/v03", poster: { making: 4 } },
  { slug: "samuel-ballet-jesus-piece", making: "08/v21" },
  // The finished piece only (no film of their fabrication was sent).
  { slug: "kenan-yildiz-celebration-pendant", folder: "11", reveal: "11/v01" },
  { slug: "the-hand", folder: "12", reveal: "12/v01" },
  { slug: "michy-batshuayi-butterfly-chain", folder: "23", reveal: "23/v04" },
  // The short edit of the finished pendant (32/v02 is the film of its delivery: the trunk, Noah Okafor and his friends).
  { slug: "noah-okafor-jersey-pendant", folder: "32", reveal: "32/v03" },

  /* ---------- The pieces published on 20/11/2026 (the drafts of 19/11) ---------- */
  // The fabrication of the chain (the video of its Fabrication/ folder): no film of the finished chain.
  { slug: "rose-iced-cuban-chain", folder: "01", making: "01/f" },
  // Its film opens on a trunk painted with a mural (a famous player): it begins at 7.4 s, on the pendant.
  { slug: "ampersand-initials-pendant", folder: "04", reveal: "04/v01", start: { reveal: 7.4 } },
  { slug: "thorns-and-roses-crucifix", folder: "05", making: "05/v02", reveal: "05/v01" },
  { slug: "script-nameplate-pendant", folder: "14", reveal: "14/v01" },
  { slug: "panther-champion-pendant", folder: "19", making: "19/v01", reveal: "19/v02" },
  // The album "Jesus piece red ruby" of Yoni (folder 20): its studio film in HD, its making-of.
  { slug: "jesus-piece-red-flowers", folder: "20", making: "20/v01", reveal: "20/v02" },
  // The album "BRT-Flower" (folder 36, 20/11/2026): its studio film and its making-of, both in ProRes (31/v02 and 08/v15
  // were their light copies).
  { slug: "brt-flower-chain", folder: "36", making: "36/v02", reveal: "36/v01" },
  // The chain Sirius (folder 37): its studio film v02 (ProRes; v01 is the same edit, compressed); its making-of, the only
  // film of its fabrication: the stones set in the plate (v05, a short phone video).
  { slug: "sirius", folder: "37", making: "37/v05", reveal: "37/v02" },
  // The L pendant of Deniz Undav (folder 38): its making-of edit (no film of the finished piece was sent).
  { slug: "deniz-undav-l-pendant", folder: "38", making: "38/v01" },
  // The baguette Cuban chain (folder 30): its studio film.
  { slug: "baguette-cuban-chain", folder: "30", reveal: "30/v01" },
  // The celestial medallion (22) has no film first: its film shows the engraved back, first names of a family and a
  // date (22/v08), kept out until Yoni says the family agrees.
];
