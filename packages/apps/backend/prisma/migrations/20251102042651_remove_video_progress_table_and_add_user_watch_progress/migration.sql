/*
  Warnings:

  - You are about to drop the `video_progress` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "watch_progress" JSONB;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "video_progress";
PRAGMA foreign_keys=on;
