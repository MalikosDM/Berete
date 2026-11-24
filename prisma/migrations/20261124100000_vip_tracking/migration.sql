-- The follow-up of a commission in the client space (Yoni, 24/11/2026): the step of the piece among the six of
-- "The Bespoke Journey", its estimated date and the history of its changes, the news of the atelier (photos, videos).
ALTER TABLE "Client" ADD COLUMN "stage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD COLUMN "estimatedAt" DATE;

CREATE TABLE "ClientDateChange" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "previous" DATE,
    "next" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientDateChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientUpdate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientUpdate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientUpdateFile" (
    "id" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientUpdateFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientDateChange_clientId_idx" ON "ClientDateChange"("clientId");
CREATE INDEX "ClientUpdate_clientId_idx" ON "ClientUpdate"("clientId");
CREATE INDEX "ClientUpdateFile_updateId_idx" ON "ClientUpdateFile"("updateId");

ALTER TABLE "ClientDateChange" ADD CONSTRAINT "ClientDateChange_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientUpdate" ADD CONSTRAINT "ClientUpdate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientUpdateFile" ADD CONSTRAINT "ClientUpdateFile_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "ClientUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
