/**
 * Photos made for the catalogue from the owner's files: the main photo of a
 * piece taken from a story (a frame of a video, or a photo cropped on the
 * jewel), the photos of a box, and the extra photos of the
 * "Boutique Bijoutier" folder. Read by scripts/import-media.mjs.
 *
 * key    where the file goes: public/media/<key>.webp
 * from   "story:NN/MM"   story folder NN, file MM ("03/21" = 03 Kevin Schade - 21)
 *        "boutique:ID"   file of the Boutique Bijoutier folder starting with ID
 *        "site:NN/MM"    folder "NN - ..." of the ODORO folder, file "MM_..."
 * at     for a video: the second of the frame
 * crop   [x, y, width, height], fractions of the picture: the part kept
 * mask   areas filled with black before the crop (a tag written on a black background)
 *
 * Videos of the Boutique Bijoutier folder are listed in BOUTIQUE_VIDEOS.
 */
export const STILLS = [
  /* ---------- Pendants ---------- */
  { key: "pieces/kenan-yildiz-celebration-pendant/angle", from: "boutique:845354996" },
  { key: "pieces/noah-okafor-oka-pendant/cover", from: "story:19/05", crop: [0.075, 0.235, 0.85, 0.52] },
  { key: "pieces/noah-okafor-octagon-pendant/cover", from: "story:11/01", at: 14, crop: [0.14, 0.3, 0.86, 0.52] },
  { key: "pieces/kevin-schade-dragon-ball-pendant/cover", from: "boutique:849726733" },
  { key: "pieces/marcus-thuram-t-monster-pendant/cover", from: "story:29/02", at: 13.5, crop: [0.04, 0.03, 0.92, 0.76] },
  { key: "pieces/marcus-thuram-thorned-t-pendant/cover", from: "story:20/05", at: 19.75, crop: [0.06, 0.16, 0.88, 0.66] },
  { key: "pieces/marcus-thuram-jesus-piece/cover", from: "story:20/03", at: 1, crop: [0.0, 0.35, 0.52, 0.44] },
  { key: "pieces/marcus-thuram-snowflake-pendant/cover", from: "story:29/03", at: 3.6, crop: [0.0, 0.1, 1.0, 0.7] },
  { key: "pieces/jamie-leweling-jl-pendant/cover", from: "story:12/01", at: 6.75, crop: [0.0, 0.16, 1.0, 0.58] },
  { key: "pieces/deniz-undav-l-pendant/cover", from: "story:13/01", mask: [[0.76, 0.55, 0.24, 0.14]] },
  { key: "pieces/malik-tillman-cross-pendant/cover", from: "story:17/03", at: 17.75, crop: [0.04, 0.06, 0.92, 0.8] },
  { key: "pieces/malik-tillman-tm-pendant/cover", from: "story:24/05", crop: [0.04, 0.04, 0.92, 0.86] },
  { key: "pieces/tanguy-nianzou-fam-medallion/cover", from: "story:23/05", at: 2.5, crop: [0.08, 0.32, 0.84, 0.6] },
  { key: "pieces/tanguy-nianzou-nz-pendant/cover", from: "story:28/01", crop: [0.06, 0.22, 0.88, 0.6] },
  { key: "pieces/sidney-eweka-999-pendant/cover", from: "story:27/02", crop: [0.0, 0.42, 1.0, 0.5] },
  { key: "pieces/jeff-chabot-jc-pendant/cover", from: "story:30/04", at: 1, crop: [0.12, 0.22, 0.56, 0.58] },
  { key: "pieces/lois-openda-nameplate-pendant/cover", from: "story:05/01", crop: [0.06, 0.2, 0.88, 0.63] },
  { key: "pieces/flaneur-medallion/cover", from: "story:09/03", at: 8, crop: [0.08, 0.24, 0.84, 0.6] },
  { key: "pieces/jack-nameplate-pendant/cover", from: "story:09/29", at: 1, crop: [0.08, 0.3, 0.88, 0.46] },
  { key: "pieces/tulips-on-tour-medallion/cover", from: "story:09/54", at: 11.5, crop: [0.08, 0.38, 0.8, 0.46] },

  /* ---------- Chains ---------- */
  { key: "pieces/marcus-thuram-infinity-chain/cover", from: "story:20/04", at: 0.5, crop: [0.0, 0.04, 1.0, 0.74] },
  { key: "pieces/the-safi-link/cover", from: "story:02/10", at: 2, crop: [0.07, 0.23, 0.86, 0.58] },

  /* ---------- Rings ---------- */
  { key: "pieces/vfb-stuttgart-dfb-pokal-2025/crest", from: "boutique:551034531" },
  { key: "pieces/tanguy-nianzou-nz-ring/cover", from: "story:28/02", at: 13, crop: [0.12, 0.44, 0.76, 0.38] },
  { key: "pieces/marcus-thuram-signet-ring/cover", from: "story:29/05", at: 11.5, crop: [0.0, 0.3, 1.0, 0.39] },

  /* ---------- Watches ---------- */
  { key: "pieces/tajon-buchanan-iced-watch/cover", from: "story:25/02", at: 6.75, crop: [0.04, 0.12, 0.92, 0.66] },
  { key: "pieces/radja-nainggolan-iced-watch/cover", from: "story:08/01", at: 5.25, crop: [0.24, 0.3, 0.7, 0.36] },
  { key: "pieces/marcus-thuram-skeleton-watch/cover", from: "story:29/01", crop: [0.07, 0.25, 0.86, 0.46] },

  /* ---------- Boxes seen in the stories ---------- */
  { key: "boxes/dragon-ball-trunk/01", from: "story:03/06", at: 1, crop: [0.08, 0.2, 0.84, 0.56] },
  { key: "boxes/campione-d-italia-case/01", from: "story:06/12" },
  { key: "boxes/campione-d-italia-case/02", from: "story:06/01" },
  { key: "boxes/nz-travel-case/01", from: "story:23/03", crop: [0.0, 0.14, 1.0, 0.62] },
  { key: "boxes/butterfly-trunk/01", from: "story:07/01", at: 0.5, crop: [0.1, 0.16, 0.8, 0.74] },
  { key: "boxes/okafor-trunk/01", from: "story:11/03", at: 2 },
  { key: "boxes/okafor-trunk/02", from: "story:11/03", at: 11 },
];

/** Videos of the Boutique Bijoutier folder used by a piece. */
export const BOUTIQUE_VIDEOS = [{ key: "pieces/campione-d-italia-2023-2024/film", from: "boutique:AQPbTPEbLa2mtO0lX01iqssJKPfRi3dlxNOaFjMg7RC8VLi5bRTvNzi9M7" }];
