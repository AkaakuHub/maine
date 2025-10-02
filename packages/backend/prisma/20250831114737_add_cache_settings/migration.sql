-- CreateTable
CREATE TABLE "cache_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'cache_settings',
    "lastFullScan" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00',
    "isScanning" BOOLEAN NOT NULL DEFAULT false,
    "scanProgress" REAL NOT NULL DEFAULT 0,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_video_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "watchProgress" REAL NOT NULL DEFAULT 0,
    "watchTime" REAL,
    "isLiked" BOOLEAN NOT NULL DEFAULT false,
    "likedAt" DATETIME,
    "isInWatchlist" BOOLEAN NOT NULL DEFAULT false,
    "watchlistAt" DATETIME,
    "lastWatched" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_video_progress" ("createdAt", "filePath", "id", "isLiked", "lastWatched", "likedAt", "updatedAt", "watchProgress", "watchTime") SELECT "createdAt", "filePath", "id", "isLiked", "lastWatched", "likedAt", "updatedAt", "watchProgress", "watchTime" FROM "video_progress";
DROP TABLE "video_progress";
ALTER TABLE "new_video_progress" RENAME TO "video_progress";
CREATE UNIQUE INDEX "video_progress_filePath_key" ON "video_progress"("filePath");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
