/**
 * The portraits of the players (page The Berete Circle, the pages of the players, the wall of the home page), from the
 * photos Yoni sent in their club jersey: folder "00 Contexte Yoni/Photos joueurs en maillot", one folder per person
 * ("Marcus Thuram"), files "<Name> - 01.jpg". Read by scripts/import-media.mjs (section "players").
 *
 * slug    the person (src/data/catalogue.ts); their folder is the one whose name gives this slug
 * photos  in order: the first one is the main portrait (cards and top of the page), the others go to "In Pictures"
 *   n     number of the file ("Marcus Thuram - 03.jpg" = 3)
 *   crop  [x, y, width, height], fractions of the photo: the part kept, 4:5 (the cards and the portrait of the page are
 *         4:5 on phones and computers alike, so one crop serves both). Found with the face detection of macOS (Vision),
 *         then checked by eye: the face in the upper third, the jersey below, never the head or the number cut.
 *
 * Not used: photos under 1000 px on their short side (Instagram copies), or blurry. A person left out keeps the photo
 * from the stories (scripts/piece-media.mjs, PORTRAITS), else their initials:
 *   Angelo Stiller  only "- 01" (1080 x 720, a back view in the crowd around the cup): too small
 *   Sambi Lokonga   folder empty
 *   Noah Okafor     "- 01" (720 x 480) and "- 02" (1080 x 719): too small; "- 03" is used
 */
export const PLAYERS = [
  { slug: "atakan-karazor", photos: [{ n: 1, crop: [0.2044, 0, 0.6997, 0.7005] }] },
  { slug: "chris-fuehrich", photos: [{ n: 1, crop: [0.3604, 0.2017, 0.3868, 0.3626] }] },
  // Sharper than the story portrait, and in the jersey.
  { slug: "deniz-undav", photos: [{ n: 1, crop: [0, 0.0333, 0.5739, 0.5747] }] },
  // A portrait without a jersey, with his clover pendant: the bottom of the photo is kept for the pendant.
  { slug: "eljero-elia", photos: [{ n: 1, crop: [0, 0.0625, 1, 0.9375] }] },
  {
    slug: "jamie-leweling",
    photos: [
      // Running, face and jersey: sharper than the story portrait.
      { n: 2, crop: [0.2215, 0, 0.5886, 0.7357] },
      // With his DFB-Pokal medal, the cup beside him.
      { n: 1, crop: [0, 0, 0.8, 1] },
    ],
  },
  {
    // A fighter (MMA), not a footballer: with his two belts first.
    slug: "keita-losene",
    photos: [
      { n: 2, crop: [0.0619, 0, 0.9309, 0.931] },
      { n: 1, crop: [0.05, 0, 0.8, 0.75] },
      { n: 3, crop: [0, 0, 1, 1] },
    ],
  },
  {
    slug: "kenan-yildiz",
    photos: [
      { n: 1, crop: [0, 0, 1, 1] },
      { n: 2, crop: [0, 0, 1, 1] },
    ],
  },
  {
    slug: "kevin-schade",
    photos: [
      { n: 1, crop: [0.1437, 0.2751, 0.5996, 0.6013] },
      { n: 2, crop: [0.2043, 0.1552, 0.6792, 0.6811] },
    ],
  },
  { slug: "lois-openda", photos: [{ n: 1, crop: [0.2434, 0.0255, 0.5882, 0.6588] }] },
  {
    slug: "malik-tillman",
    photos: [
      // Presenting his jersey (17), face to the camera.
      { n: 1, crop: [0.2075, 0.3839, 0.6175, 0.579] },
      { n: 2, crop: [0.194, 0.0646, 0.5438, 0.5121] },
    ],
  },
  {
    slug: "marcus-thuram",
    photos: [
      // Face and jersey seen (in "- 01" his hand hides his face, "- 02" is a back view).
      { n: 3, crop: [0.2974, 0.2324, 0.555, 0.56] },
      { n: 1, crop: [0, 0.03125, 1, 0.9375] },
      { n: 2, crop: [0.0045, 0, 0.9909, 1] },
    ],
  },
  {
    slug: "maximilian-mittelstaedt",
    photos: [
      { n: 1, crop: [0.1548, 0.0716, 0.5771, 0.5411] },
      { n: 2, crop: [0, 0.03, 1, 0.9374] },
    ],
  },
  { slug: "michy-batshuayi", photos: [{ n: 1, crop: [0.1536, 0.1007, 0.7965, 0.7987] }] },
  { slug: "noah-okafor", photos: [{ n: 3, crop: [0.3207, 0.0746, 0.4183, 0.4179] }] },
  {
    slug: "radja-nainggolan",
    photos: [
      // Below the logos of the broadcaster (top right).
      { n: 1, crop: [0.0972, 0.115, 0.8824, 0.885] },
      { n: 2, crop: [0.0014, 0, 0.9972, 1] },
    ],
  },
  { slug: "samuel-ballet", photos: [{ n: 1, crop: [0.1925, 0, 0.7489, 0.7128] }] },
  // The only photo: a back view, his name and number seen.
  { slug: "tajon-buchanan", photos: [{ n: 1, crop: [0.12, 0, 0.76, 0.76] }] },
];
