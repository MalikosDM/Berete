-- The private correspondence of the contact page (22/11/2026): an Instagram handle and up to 6 photos per message,
-- stored in the base (never public, read from the admin only).
ALTER TABLE "ContactMessage" ADD COLUMN "instagram" TEXT;

CREATE TABLE "ContactPhoto" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactPhoto_messageId_idx" ON "ContactPhoto"("messageId");

ALTER TABLE "ContactPhoto" ADD CONSTRAINT "ContactPhoto_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ContactMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
