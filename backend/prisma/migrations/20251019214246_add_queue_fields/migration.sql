/*
  Warnings:

  - You are about to drop the `RateCounter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `isActive` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `checksum` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `durationSec` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `mime` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `sizeBytes` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `params` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Job` table. All the data in the column will be lost.
  - Added the required column `userId` to the `ApiKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobId` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prompt` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RateCounter_apiKeyId_windowStart_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RateCounter";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT NOT NULL,
    "windowStart" DATETIME NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RateLimit_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT NOT NULL,
    "jobId" TEXT,
    "action" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usage_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "userId" TEXT NOT NULL,
    "rateLimitPerMin" INTEGER NOT NULL DEFAULT 60,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ApiKey" ("createdAt", "id", "key", "name", "rateLimitPerMin", "userId") SELECT "createdAt", "id", "key", "name", coalesce("rateLimitPerMin", 60) AS "rateLimitPerMin", 'default-user' AS "userId" FROM "ApiKey";
DROP TABLE "ApiKey";
ALTER TABLE "new_ApiKey" RENAME TO "ApiKey";
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");
CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT,
    "meta" TEXT,
    "size" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Asset_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("createdAt", "id", "meta", "path") SELECT "createdAt", "id", "meta", "path" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "prompt" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "includeVideo" BOOLEAN NOT NULL DEFAULT false,
    "plan" TEXT,
    "error" TEXT,
    "result" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "parentId" TEXT,
    "assetId" TEXT,
    "apiKeyId" TEXT,
    "dedupeKey" TEXT,
    "lastSuccessAt" DATETIME,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "backoffMs" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT
);
INSERT INTO "new_Job" ("apiKeyId", "assetId", "attempts", "availableAt", "backoffMs", "completedAt", "createdAt", "dedupeKey", "error", "id", "lastSuccessAt", "maxAttempts", "parentId", "result", "startedAt", "status", "updatedAt") SELECT "apiKeyId", "assetId", "attempts", "availableAt", "backoffMs", "completedAt", "createdAt", "dedupeKey", "error", "id", "lastSuccessAt", "maxAttempts", "parentId", "result", "startedAt", "status", "updatedAt" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_apiKeyId_windowStart_key" ON "RateLimit"("apiKeyId", "windowStart");
