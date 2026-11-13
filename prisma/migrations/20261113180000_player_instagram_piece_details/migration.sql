-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "instagram" TEXT;

-- AlterTable
ALTER TABLE "Piece" ADD COLUMN     "details" JSONB NOT NULL DEFAULT '[]';
