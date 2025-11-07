-- CreateTable
CREATE TABLE "sdk_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "siteId" TEXT,
    "domain" TEXT,
    "pageUrl" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "fingerprint" TEXT,
    "requestBody" TEXT,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "error" TEXT,
    "duration" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sdk_interactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT,
    "type" TEXT NOT NULL,
    "adId" TEXT,
    "campaignId" TEXT,
    "siteId" TEXT,
    "pageUrl" TEXT,
    "elementType" TEXT,
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sdk_interactions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sdk_requests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "api_route_calls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestBody" TEXT,
    "responseBody" TEXT,
    "error" TEXT,
    "duration" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "callback_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "fingerprint" TEXT,
    "statusCode" INTEGER,
    "error" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "sdk_requests_type_idx" ON "sdk_requests"("type");

-- CreateIndex
CREATE INDEX "sdk_requests_timestamp_idx" ON "sdk_requests"("timestamp");

-- CreateIndex
CREATE INDEX "sdk_requests_siteId_idx" ON "sdk_requests"("siteId");

-- CreateIndex
CREATE INDEX "sdk_interactions_type_idx" ON "sdk_interactions"("type");

-- CreateIndex
CREATE INDEX "sdk_interactions_timestamp_idx" ON "sdk_interactions"("timestamp");

-- CreateIndex
CREATE INDEX "sdk_interactions_adId_idx" ON "sdk_interactions"("adId");

-- CreateIndex
CREATE INDEX "api_route_calls_route_idx" ON "api_route_calls"("route");

-- CreateIndex
CREATE INDEX "api_route_calls_timestamp_idx" ON "api_route_calls"("timestamp");

-- CreateIndex
CREATE INDEX "api_route_calls_statusCode_idx" ON "api_route_calls"("statusCode");

-- CreateIndex
CREATE INDEX "callback_logs_type_idx" ON "callback_logs"("type");

-- CreateIndex
CREATE INDEX "callback_logs_timestamp_idx" ON "callback_logs"("timestamp");

