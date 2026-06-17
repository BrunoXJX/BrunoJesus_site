-- CreateEnum
CREATE TYPE "GmailActionType" AS ENUM ('SUGGESTIONS_GENERATED', 'REPLY_SENT', 'SESSION_CREATED', 'SESSION_REVOKED');

-- CreateEnum
CREATE TYPE "GmailActionStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "GmailAccount" (
    "id" TEXT NOT NULL,
    "googleUserId" VARCHAR(128) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "displayName" VARCHAR(120),
    "refreshTokenEncrypted" TEXT NOT NULL,
    "tokenScope" VARCHAR(512),
    "tokenExpiry" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailOAuthState" (
    "stateHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GmailOAuthState_pkey" PRIMARY KEY ("stateHash")
);

-- CreateTable
CREATE TABLE "GmailLabSession" (
    "id" TEXT NOT NULL,
    "sessionTokenHash" VARCHAR(128) NOT NULL,
    "accountId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GmailLabSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailAutomationLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "action" "GmailActionType" NOT NULL,
    "status" "GmailActionStatus" NOT NULL,
    "gmailMessageId" VARCHAR(128),
    "gmailThreadId" VARCHAR(128),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GmailAutomationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GmailAccount_googleUserId_key" ON "GmailAccount"("googleUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GmailAccount_email_key" ON "GmailAccount"("email");

-- CreateIndex
CREATE INDEX "GmailAccount_email_idx" ON "GmailAccount"("email");

-- CreateIndex
CREATE INDEX "GmailAccount_updatedAt_idx" ON "GmailAccount"("updatedAt");

-- CreateIndex
CREATE INDEX "GmailOAuthState_expiresAt_idx" ON "GmailOAuthState"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GmailLabSession_sessionTokenHash_key" ON "GmailLabSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "GmailLabSession_accountId_idx" ON "GmailLabSession"("accountId");

-- CreateIndex
CREATE INDEX "GmailLabSession_expiresAt_idx" ON "GmailLabSession"("expiresAt");

-- CreateIndex
CREATE INDEX "GmailAutomationLog_accountId_idx" ON "GmailAutomationLog"("accountId");

-- CreateIndex
CREATE INDEX "GmailAutomationLog_action_idx" ON "GmailAutomationLog"("action");

-- CreateIndex
CREATE INDEX "GmailAutomationLog_createdAt_idx" ON "GmailAutomationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "GmailLabSession" ADD CONSTRAINT "GmailLabSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "GmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailAutomationLog" ADD CONSTRAINT "GmailAutomationLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "GmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
