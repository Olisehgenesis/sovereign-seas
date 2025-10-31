-- Add API keys for SDK authentication
-- AlterTable: Add columns as nullable first
ALTER TABLE "publisher_sites" ADD COLUMN "apiKey" TEXT;
ALTER TABLE "publisher_sites" ADD COLUMN "apiSecret" TEXT;

-- Generate API keys for existing sites
-- Using SQLite's random() function to generate random hex
UPDATE "publisher_sites" SET 
  "apiKey" = lower(hex(randomblob(16))),
  "apiSecret" = lower(hex(randomblob(32)))
WHERE "apiKey" IS NULL;

-- Now make them NOT NULL and create unique index
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- But since we just added values, we can proceed with constraints

-- Create unique index on apiKey
CREATE UNIQUE INDEX IF NOT EXISTS "publisher_sites_apiKey_key" ON "publisher_sites"("apiKey");
