/*
  Warnings:

  - You are about to drop the `scan_checkpoint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scan_status` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `video_metadata` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `video_progress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "scan_checkpoint";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "scan_status";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "video_metadata";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "video_progress";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "chapter_skip_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'user_settings',
    "chapterSkipEnabled" BOOLEAN NOT NULL DEFAULT true,
    "skipNotificationShow" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scan_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'scan_settings',
    "batchSize" INTEGER NOT NULL DEFAULT 50,
    "progressUpdateInterval" INTEGER NOT NULL DEFAULT 100,
    "sleepInterval" INTEGER NOT NULL DEFAULT 1,
    "processingPriority" TEXT NOT NULL DEFAULT 'normal',
    "maxConcurrentOperations" INTEGER NOT NULL DEFAULT 4,
    "memoryThresholdMB" INTEGER NOT NULL DEFAULT 1024,
    "autoPauseOnHighCPU" BOOLEAN NOT NULL DEFAULT false,
    "autoPauseThreshold" INTEGER NOT NULL DEFAULT 80,
    "autoPauseStartHour" INTEGER NOT NULL DEFAULT 9,
    "autoPauseEndHour" INTEGER NOT NULL DEFAULT 18,
    "enableDetailedLogging" BOOLEAN NOT NULL DEFAULT false,
    "enableResourceMonitoring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scan_schedule_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'scan_schedule_settings',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cronPattern" TEXT,
    "interval" TEXT NOT NULL DEFAULT 'weekly',
    "intervalHours" INTEGER NOT NULL DEFAULT 168,
    "executionTimeHour" INTEGER NOT NULL DEFAULT 3,
    "executionTimeMinute" INTEGER NOT NULL DEFAULT 0,
    "weeklyDays" TEXT NOT NULL DEFAULT '[0]',
    "monthlyDay" INTEGER NOT NULL DEFAULT 1,
    "skipIfRunning" BOOLEAN NOT NULL DEFAULT true,
    "maxExecutionTimeMinutes" INTEGER NOT NULL DEFAULT 180,
    "onlyWhenIdle" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "chapter_skip_rules_enabled_idx" ON "chapter_skip_rules"("enabled");

-- CreateIndex
CREATE INDEX "chapter_skip_rules_pattern_idx" ON "chapter_skip_rules"("pattern");
