-- CreateTable
CREATE TABLE "video_progress" (
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
    "updatedAt" DATETIME NOT NULL,
    "duration" INTEGER,
    "metadata_extracted_at" DATETIME,
    "thumbnail_path" TEXT
);

-- CreateTable
CREATE TABLE "scan_status" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'scan_status',
    "lastFullScan" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00',
    "isScanning" BOOLEAN NOT NULL DEFAULT false,
    "scanProgress" REAL NOT NULL DEFAULT 0,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scan_checkpoint" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'scan_checkpoint',
    "scanId" TEXT NOT NULL,
    "scanType" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "currentDirectoryIndex" INTEGER NOT NULL DEFAULT 0,
    "processedFiles" INTEGER NOT NULL DEFAULT 0,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "lastProcessedPath" TEXT,
    "metadataCompleted" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckpointAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "video_progress_filePath_key" ON "video_progress"("filePath");

-- CreateIndex
CREATE UNIQUE INDEX "video_metadata_filePath_key" ON "video_metadata"("filePath");

-- CreateIndex
CREATE INDEX "video_metadata_title_idx" ON "video_metadata"("title");

-- CreateIndex
CREATE INDEX "video_metadata_fileName_idx" ON "video_metadata"("fileName");

-- CreateIndex
CREATE INDEX "video_metadata_filePath_idx" ON "video_metadata"("filePath");
