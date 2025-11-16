/*
  Warnings:

  - Made the column `videoId` on table `video_metadata` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_video_metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL DEFAULT 0,
    "episode" INTEGER,
    "year" INTEGER,
    "lastModified" DATETIME NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "duration" INTEGER,
    "metadata_extracted_at" DATETIME,
    "thumbnail_path" TEXT,
    "videoId" TEXT NOT NULL
);
INSERT INTO "new_video_metadata" ("duration", "episode", "fileName", "filePath", "fileSize", "id", "lastModified", "metadata_extracted_at", "scannedAt", "thumbnail_path", "title", "updatedAt", "videoId", "year") SELECT "duration", "episode", "fileName", "filePath", "fileSize", "id", "lastModified", "metadata_extracted_at", "scannedAt", "thumbnail_path", "title", "updatedAt", "videoId", "year" FROM "video_metadata";
DROP TABLE "video_metadata";
ALTER TABLE "new_video_metadata" RENAME TO "video_metadata";
CREATE UNIQUE INDEX "video_metadata_filePath_key" ON "video_metadata"("filePath");
CREATE UNIQUE INDEX "video_metadata_videoId_key" ON "video_metadata"("videoId");
CREATE INDEX "video_metadata_title_idx" ON "video_metadata"("title");
CREATE INDEX "video_metadata_fileName_idx" ON "video_metadata"("fileName");
CREATE INDEX "video_metadata_filePath_idx" ON "video_metadata"("filePath");
CREATE INDEX "video_metadata_videoId_idx" ON "video_metadata"("videoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
