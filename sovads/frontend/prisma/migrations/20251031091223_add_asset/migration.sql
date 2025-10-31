-- CreateTable
CREATE TABLE "advertisers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallet" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "company" TEXT,
    "subscriptionPlan" TEXT,
    "subscriptionActive" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionDate" DATETIME,
    "totalSpent" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallet" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "totalEarned" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advertiserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bannerUrl" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "budget" DECIMAL NOT NULL,
    "spent" DECIMAL NOT NULL DEFAULT 0,
    "cpc" DECIMAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadataURI" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "campaigns_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "advertisers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fingerprint" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "events_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analytics_hashes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT,
    "contentType" TEXT NOT NULL,
    "dataBase64" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "advertisers_wallet_key" ON "advertisers"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "publishers_wallet_key" ON "publishers"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_hashes_hash_key" ON "analytics_hashes"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_hashes_date_key" ON "analytics_hashes"("date");
