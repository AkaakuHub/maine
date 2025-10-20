/*
  Warnings:

  - You are about to drop the `cache_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "cache_settings";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "video_metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL DEFAULT 0,
    "episode" INTEGER,
    "year" INTEGER,
    "lastModified" DATETIME NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scan_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'scan_settings',
    "lastFullScan" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00',
    "isScanning" BOOLEAN NOT NULL DEFAULT false,
    "scanProgress" REAL NOT NULL DEFAULT 0,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "video_metadata_filePath_key" ON "video_metadata"("filePath");

-- CreateIndex
CREATE INDEX "video_metadata_title_idx" ON "video_metadata"("title");

-- CreateIndex
CREATE INDEX "video_metadata_fileName_idx" ON "video_metadata"("fileName");

-- CreateIndex
CREATE INDEX "video_metadata_filePath_idx" ON "video_metadata"("filePath");
