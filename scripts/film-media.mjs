/*
 * The films of "Enter the Atelier" (src/data/atelier.ts): for each piece, its making-of (the film of its fabrication)
 * and its finished piece ("The Final Reveal"). Read by scripts/import-media.mjs (section "films") from the folders of
 * Yoni (BERETE_HD_DIR, "Berete - Dossiers icloud"); the source files are only read, never changed.
 *
 * Each film is "NN/vMM" (folder NN, video MM) or "NN/f" (the video of its Fabrication/ folder). The best copy of it is
 * taken: the file of "Videos HD/" with the same number when there is one (the original in high quality), else the file
 * of "Videos/" without "(720p)", else its light "(720p)" copy. A folder of the piece whose "Videos HD/" holds a file named
 * after its kind ("…Craftsmanship…", "…Process…": the making-of; "Final Product Video", "Final cut": the finished piece)
 * uses that one instead.
 *
 * Chosen by eye on 19/11/2026 (frames of every video): the professional edits first (studio light, 25 frames a second,
 * with music), a phone video only when nothing else exists and it is clean. Folder 08 ("Fabrication atelier (divers)")
 * holds the making-of of several pieces, recognised on their last shots (the finished piece): 08/v05 is the VfB film in
 * high quality (29/v02 is its light copy), 08/v14 ends on the T-Serpent, 08/v21 on the Jesus piece of Samuel Ballet.
 * Not used: the delivery videos (players, cars), the phone videos of the finished piece in a glove, 08/v15 and 31/v02 (a
 * flower chain with a BRT clasp that matches no piece), 20 (the Jesus piece of Marcus Thuram, removed).
 *
 * folder: the folder of the piece itself (scripts/hd-media.mjs), where a "Videos HD/" film named after its kind is looked
 * for. A piece of the drafts (unpublished) and a finished piece without a making-of (its page shows no atelier) get the
 * light copy only. poster: the frame used as its image by default (1 to 6), when the one found by the numbers (the sharpest
 * well-lit) is not the best one to the eye (all were looked at on 19/11/2026); the admin can choose another.
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
  // The film of its delivery: the trunk, the pendant, Noah Okafor and his friends.
  { slug: "noah-okafor-jersey-pendant", folder: "32", reveal: "32/v02" },

  /* ---------- Drafts (unpublished, to be named by Yoni) ---------- */
  { slug: "chaine-cubaine-glacee-or-rose", folder: "01", draft: true, making: "01/f" },
  { slug: "pendentif-initiales-de", folder: "04", draft: true, reveal: "04/v01" },
  { slug: "pendentif-croix-christ-or-rose", folder: "05", draft: true, making: "05/v02", reveal: "05/v01" },
  { slug: "pendentif-nom-en-lettres", folder: "14", draft: true, reveal: "14/v01" },
  { slug: "pendentif-tete-animal", folder: "19", draft: true, making: "19/v01", reveal: "19/v02" },
  { slug: "medaille-gravee-nathalie-jose", folder: "22", draft: true, reveal: "22/v08" },
  { slug: "chaine-cubaine-baguettes", folder: "30", draft: true, reveal: "30/v01" },
];

/** The words of the original names in "Videos HD/" that tell the kind of a film. */
export const KIND_WORDS = {
  making: /craftsmanship|process/i,
  reveal: /final product video|final cut/i,
};
