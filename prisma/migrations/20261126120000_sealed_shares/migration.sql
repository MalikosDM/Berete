-- Share links sealed on the admin's device (26/11/2026): the 3D model encrypted in the browser of the admin (AES-256-GCM),
-- the key derived from an optional password or carried only in the #fragment of the link. The server keeps the ciphertext
-- (storage/shares/<token>.bin) and what the page needs to decrypt it, never the key nor the password.
CREATE TABLE "SealedShare" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hasPassword" BOOLEAN NOT NULL DEFAULT false,
    "salt" TEXT NOT NULL DEFAULT '',
    "iv" TEXT NOT NULL,
    "iterations" INTEGER NOT NULL DEFAULT 0,
    "verifier" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SealedShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SealedShare_token_key" ON "SealedShare"("token");
CREATE INDEX "SealedShare_modelId_idx" ON "SealedShare"("modelId");
CREATE INDEX "SealedShare_expiresAt_idx" ON "SealedShare"("expiresAt");

ALTER TABLE "SealedShare" ADD CONSTRAINT "SealedShare_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;
