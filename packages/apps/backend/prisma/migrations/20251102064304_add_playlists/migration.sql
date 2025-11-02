-- CreateTable
CREATE TABLE "playlists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "video_playlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "video_playlist_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "video_metadata" ("videoId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "video_playlist_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "playlists_name_key" ON "playlists"("name");

-- CreateIndex
CREATE UNIQUE INDEX "playlists_path_key" ON "playlists"("path");

-- CreateIndex
CREATE INDEX "playlists_name_idx" ON "playlists"("name");

-- CreateIndex
CREATE INDEX "playlists_path_idx" ON "playlists"("path");

-- CreateIndex
CREATE INDEX "playlists_isActive_idx" ON "playlists"("isActive");

-- CreateIndex
CREATE INDEX "video_playlist_playlistId_idx" ON "video_playlist"("playlistId");

-- CreateIndex
CREATE INDEX "video_playlist_videoId_idx" ON "video_playlist"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "video_playlist_videoId_playlistId_key" ON "video_playlist"("videoId", "playlistId");
