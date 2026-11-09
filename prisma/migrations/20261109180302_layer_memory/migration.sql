-- CreateTable
CREATE TABLE "LayerMemory" (
    "name" TEXT NOT NULL,
    "setting" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LayerMemory_pkey" PRIMARY KEY ("name")
);
