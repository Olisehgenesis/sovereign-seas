-- CreateTable
CREATE TABLE "publisher_sites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publisherId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "publisher_sites_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "siteId" TEXT,
    "publisherSiteId" TEXT,
    "adId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fingerprint" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "events_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "events_publisherSiteId_fkey" FOREIGN KEY ("publisherSiteId") REFERENCES "publisher_sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_events" ("adId", "campaignId", "fingerprint", "id", "ipAddress", "publisherId", "siteId", "timestamp", "type", "userAgent", "verified") SELECT "adId", "campaignId", "fingerprint", "id", "ipAddress", "publisherId", "siteId", "timestamp", "type", "userAgent", "verified" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "publisher_sites_siteId_key" ON "publisher_sites"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "publisher_sites_publisherId_domain_key" ON "publisher_sites"("publisherId", "domain");
