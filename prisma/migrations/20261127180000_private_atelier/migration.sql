-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "accessEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "loginEmail" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "totpLastStep" INTEGER,
ADD COLUMN     "totpPending" TEXT,
ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "twoFactor" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ClientUpdate" ADD COLUMN     "draft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "ClientInvite" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tokenKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCode" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLogin" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "email" TEXT NOT NULL DEFAULT '',
    "event" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "designFeeCents" INTEGER NOT NULL DEFAULT 100000,
    "designFeePaidAt" DATE,
    "designFeeMethod" TEXT NOT NULL DEFAULT '',
    "allowedMetals" JSONB NOT NULL DEFAULT '[]',
    "allowedStones" JSONB NOT NULL DEFAULT '[]',
    "step" INTEGER NOT NULL DEFAULT -1,
    "deliveryFrom" DATE,
    "deliveryTo" DATE,
    "orderAcceptedAt" TIMESTAMP(3),
    "productionAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "modelId" TEXT,
    "changes" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "point" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignApproval" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "versionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "materials" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "feesLabel" TEXT NOT NULL DEFAULT '',
    "leadTime" TEXT NOT NULL DEFAULT '',
    "schedule" TEXT NOT NULL DEFAULT '',
    "terms" TEXT NOT NULL DEFAULT '',
    "pdfSha256" TEXT,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedEmail" TEXT NOT NULL DEFAULT '',
    "acceptedIp" TEXT NOT NULL DEFAULT '',
    "acceptedUa" TEXT NOT NULL DEFAULT '',
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripeSession" TEXT,
    "stripeIntent" TEXT,
    "method" TEXT NOT NULL DEFAULT '',
    "paidAt" TIMESTAMP(3),
    "receiptNumber" TEXT,
    "receiptSha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStep" (
    "projectId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStep_pkey" PRIMARY KEY ("projectId","step")
);

-- CreateTable
CREATE TABLE "ProjectMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMessageFile" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMessageFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEmail" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiStudio" (
    "id" TEXT NOT NULL,
    "tokenKey" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiStudio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConcept" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT '',
    "ext" TEXT NOT NULL DEFAULT 'jpg',
    "kept" BOOLEAN NOT NULL DEFAULT false,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL DEFAULT '',
    "visitorKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiReference" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "conceptIds" JSONB NOT NULL DEFAULT '[]',
    "referenceIds" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'new',
    "clientId" TEXT,
    "projectId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvite_tokenKey_key" ON "ClientInvite"("tokenKey");

-- CreateIndex
CREATE INDEX "ClientInvite_clientId_idx" ON "ClientInvite"("clientId");

-- CreateIndex
CREATE INDEX "ClientSession_clientId_idx" ON "ClientSession"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCode_codeKey_key" ON "ClientCode"("codeKey");

-- CreateIndex
CREATE INDEX "ClientCode_clientId_idx" ON "ClientCode"("clientId");

-- CreateIndex
CREATE INDEX "ClientLogin_clientId_idx" ON "ClientLogin"("clientId");

-- CreateIndex
CREATE INDEX "ClientLogin_createdAt_idx" ON "ClientLogin"("createdAt");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignVersion_projectId_number_key" ON "DesignVersion"("projectId", "number");

-- CreateIndex
CREATE INDEX "ChangeRequest_projectId_idx" ON "ChangeRequest"("projectId");

-- CreateIndex
CREATE INDEX "DesignApproval_projectId_idx" ON "DesignApproval"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_projectId_number_key" ON "Quote"("projectId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSession_key" ON "Payment"("stripeSession");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_projectId_idx" ON "Payment"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMessage_projectId_idx" ON "ProjectMessage"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMessageFile_messageId_idx" ON "ProjectMessageFile"("messageId");

-- CreateIndex
CREATE INDEX "ProjectEvent_projectId_idx" ON "ProjectEvent"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "OutboxEmail_createdAt_idx" ON "OutboxEmail"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiStudio_tokenKey_key" ON "AiStudio"("tokenKey");

-- CreateIndex
CREATE INDEX "AiConcept_studioId_idx" ON "AiConcept"("studioId");

-- CreateIndex
CREATE INDEX "AiConcept_createdAt_idx" ON "AiConcept"("createdAt");

-- CreateIndex
CREATE INDEX "AiConcept_visitorKey_createdAt_idx" ON "AiConcept"("visitorKey", "createdAt");

-- CreateIndex
CREATE INDEX "AiReference_studioId_idx" ON "AiReference"("studioId");

-- CreateIndex
CREATE INDEX "AiRequest_createdAt_idx" ON "AiRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_loginEmail_key" ON "Client"("loginEmail");

-- CreateIndex
CREATE INDEX "ClientUpdate_projectId_idx" ON "ClientUpdate"("projectId");

-- AddForeignKey
ALTER TABLE "ClientUpdate" ADD CONSTRAINT "ClientUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvite" ADD CONSTRAINT "ClientInvite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCode" ADD CONSTRAINT "ClientCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignVersion" ADD CONSTRAINT "DesignVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignVersion" ADD CONSTRAINT "DesignVersion_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model3D"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DesignVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignApproval" ADD CONSTRAINT "DesignApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignApproval" ADD CONSTRAINT "DesignApproval_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DesignVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStep" ADD CONSTRAINT "ProjectStep_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMessageFile" ADD CONSTRAINT "ProjectMessageFile_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ProjectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEvent" ADD CONSTRAINT "ProjectEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConcept" ADD CONSTRAINT "AiConcept_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "AiStudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReference" ADD CONSTRAINT "AiReference_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "AiStudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRequest" ADD CONSTRAINT "AiRequest_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "AiStudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

