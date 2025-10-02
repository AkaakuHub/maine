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
