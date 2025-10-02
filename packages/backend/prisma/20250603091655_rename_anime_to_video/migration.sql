-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "duration" REAL,
    "fileSize" BIGINT,
    "thumbnail" TEXT,
    "episode" INTEGER,
    "season" TEXT,
    "genre" TEXT,
    "year" INTEGER,
    "rating" REAL,
    "lastWatched" DATETIME,
    "watchTime" REAL,
    "watchProgress" REAL NOT NULL DEFAULT 0,
    "isLiked" BOOLEAN NOT NULL DEFAULT false,
    "likedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "videos_fileName_key" ON "videos"("fileName");

-- CreateIndex
CREATE UNIQUE INDEX "videos_filePath_key" ON "videos"("filePath");
