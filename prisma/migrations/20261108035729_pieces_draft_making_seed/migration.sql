-- AlterTable
ALTER TABLE "Box" ADD COLUMN     "seedHash" TEXT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "seedHash" TEXT;

-- AlterTable
ALTER TABLE "Piece" ADD COLUMN     "draft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "making" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "seedHash" TEXT;

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "seedHash" TEXT;
