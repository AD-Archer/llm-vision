-- CreateTable
CREATE TABLE "InvitationCode" (
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InvitationCode_pkey" PRIMARY KEY ("code")
);
