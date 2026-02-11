-- Unify settings into main database.
-- This migration ensures all settings tables exist in the main DB and
-- guarantees the scan_settings table has the scanMode column.

CREATE TABLE IF NOT EXISTS "chapter_skip_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "chapter_skip_rules_enabled_idx" ON "chapter_skip_rules"("enabled");
CREATE INDEX IF NOT EXISTS "chapter_skip_rules_pattern_idx" ON "chapter_skip_rules"("pattern");

CREATE TABLE IF NOT EXISTS "user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'user_settings',
    "chapterSkipEnabled" BOOLEAN NOT NULL DEFAULT true,
    "skipNotificationShow" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "scan_schedule_settings" (
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

-- Prepare old schema shape if the table does not exist yet.
CREATE TABLE IF NOT EXISTS "scan_settings" (
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

CREATE TABLE "scan_settings_new" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'scan_settings',
    "scanMode" TEXT NOT NULL DEFAULT 'lightweight',
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

INSERT OR REPLACE INTO "scan_settings_new" (
    "id",
    "scanMode",
    "batchSize",
    "progressUpdateInterval",
    "sleepInterval",
    "processingPriority",
    "maxConcurrentOperations",
    "memoryThresholdMB",
    "autoPauseOnHighCPU",
    "autoPauseThreshold",
    "autoPauseStartHour",
    "autoPauseEndHour",
    "enableDetailedLogging",
    "enableResourceMonitoring",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    'lightweight',
    "batchSize",
    "progressUpdateInterval",
    "sleepInterval",
    "processingPriority",
    "maxConcurrentOperations",
    "memoryThresholdMB",
    "autoPauseOnHighCPU",
    "autoPauseThreshold",
    "autoPauseStartHour",
    "autoPauseEndHour",
    "enableDetailedLogging",
    "enableResourceMonitoring",
    "createdAt",
    "updatedAt"
FROM "scan_settings";

DROP TABLE "scan_settings";
ALTER TABLE "scan_settings_new" RENAME TO "scan_settings";
