-- CreateTable
CREATE TABLE "Model3D" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "step" TEXT NOT NULL DEFAULT '',
    "error" TEXT,
    "sizes" JSONB NOT NULL DEFAULT '{}',
    "stats" JSONB NOT NULL DEFAULT '{}',
    "layers" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "hasPoster" BOOLEAN NOT NULL DEFAULT false,
    "pieceSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model3D_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ViewLink_token_key" ON "ViewLink"("token");

-- AddForeignKey
ALTER TABLE "ViewLink" ADD CONSTRAINT "ViewLink_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;
