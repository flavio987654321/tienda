CREATE TABLE "TurnstileWidget" (
    "siteKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secretEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurnstileWidget_pkey" PRIMARY KEY ("siteKey")
);

CREATE TABLE "TurnstileHostname" (
    "hostname" TEXT NOT NULL,
    "siteKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TurnstileHostname_pkey" PRIMARY KEY ("hostname"),
    CONSTRAINT "TurnstileHostname_siteKey_fkey" FOREIGN KEY ("siteKey") REFERENCES "TurnstileWidget"("siteKey") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TurnstileHostname_siteKey_idx" ON "TurnstileHostname"("siteKey");
