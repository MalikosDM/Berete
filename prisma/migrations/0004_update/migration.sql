-- CreateTable
CREATE TABLE "SiteFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteFlag_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Story" ADD COLUMN "articleUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SiteFlag_key_key" ON "SiteFlag"("key");
