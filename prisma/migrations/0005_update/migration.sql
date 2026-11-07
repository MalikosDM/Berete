-- AlterTable
ALTER TABLE "Player" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'player';

-- AlterTable
ALTER TABLE "Story" ADD COLUMN "ownerSlug" TEXT;

-- AlterTable
ALTER TABLE "Jewel" ADD COLUMN "playerSlugs" TEXT NOT NULL DEFAULT '';
