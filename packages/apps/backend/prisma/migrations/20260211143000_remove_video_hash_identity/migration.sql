-- Switch video identity from content hash to primary key id.
-- Data migration is intentionally destructive because the environment allows DB reset.

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "video_playlist";
DROP TABLE IF EXISTS "video_metadata";

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
    "updatedAt" DATETIME NOT NULL,
    "duration" INTEGER,
    "metadata_extracted_at" DATETIME,
    "thumbnail_path" TEXT
);

CREATE UNIQUE INDEX "video_metadata_filePath_key" ON "video_metadata"("filePath");
CREATE INDEX "video_metadata_title_idx" ON "video_metadata"("title");
CREATE INDEX "video_metadata_fileName_idx" ON "video_metadata"("fileName");
CREATE INDEX "video_metadata_filePath_idx" ON "video_metadata"("filePath");

CREATE TABLE "video_playlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "video_metadata_id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "video_playlist_video_metadata_id_fkey" FOREIGN KEY ("video_metadata_id") REFERENCES "video_metadata" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "video_playlist_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "video_playlist_video_metadata_id_playlistId_key" ON "video_playlist"("video_metadata_id", "playlistId");
CREATE INDEX "video_playlist_playlistId_idx" ON "video_playlist"("playlistId");
CREATE INDEX "video_playlist_video_metadata_id_idx" ON "video_playlist"("video_metadata_id");

PRAGMA foreign_keys=ON;
