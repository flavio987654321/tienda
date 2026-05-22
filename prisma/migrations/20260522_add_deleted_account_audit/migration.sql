-- CreateTable
CREATE TABLE "DeletedAccountAudit" (
    "id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedByAdminId" TEXT NOT NULL,
    "originalUserId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountCreatedAt" TIMESTAMP(3) NOT NULL,
    "tcAffiliateAcceptedAt" TIMESTAMP(3),
    "tcAffiliateVersion" TEXT,
    "tcAffiliateAcceptedIp" TEXT,
    "tcOwnerAcceptedAt" TIMESTAMP(3),
    "tcOwnerVersion" TEXT,
    "tcOwnerAcceptedIp" TEXT,
    "subscriptionRole" TEXT,
    "subscriptionPlan" TEXT,
    "subscriptionStatus" TEXT,
    "subscriptionCreatedAt" TIMESTAMP(3),

    CONSTRAINT "DeletedAccountAudit_pkey" PRIMARY KEY ("id")
);
