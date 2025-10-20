/*
  Warnings:

  - You are about to drop the `videos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "videos";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "video_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "watchProgress" REAL NOT NULL DEFAULT 0,
    "watchTime" REAL,
    "isLiked" BOOLEAN NOT NULL DEFAULT false,
    "likedAt" DATETIME,
    "lastWatched" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "video_progress_filePath_key" ON "video_progress"("filePath");
