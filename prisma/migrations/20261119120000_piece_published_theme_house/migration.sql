-- Pieces: shown on the site or not, and the universe of their page.
ALTER TABLE "Piece" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Piece" ADD COLUMN "theme" JSONB;

-- The ten pieces Yoni asked to remove from the catalogue (19 November 2026): kept, unpublished (he can publish them
-- again from the admin).
UPDATE "Piece" SET "published" = false WHERE "slug" IN (
  'jack-nameplate-pendant',
  'marcus-thuram-infinity-chain',
  'marcus-thuram-snowflake-pendant',
  'marcus-thuram-jesus-piece',
  'marcus-thuram-signet-ring',
  'marcus-thuram-t-monster-pendant',
  'jeff-chabot-jc-pendant',
  'tanguy-nianzou-nz-pendant',
  'tanguy-nianzou-nz-ring',
  'sidney-eweka-999-pendant'
);

-- The personal photos of Yoni on the page The House.
CREATE TABLE "HousePhoto" (
    "key" TEXT NOT NULL,
    "photo" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousePhoto_pkey" PRIMARY KEY ("key")
);
