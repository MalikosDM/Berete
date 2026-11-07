-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "name" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);
