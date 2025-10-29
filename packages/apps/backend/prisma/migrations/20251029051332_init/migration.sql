-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "directory_path" TEXT NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT true,
    "can_write" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "updatedAt" DATETIME NOT NULL,
    "user_id" TEXT,
    CONSTRAINT "video_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_video_progress" ("createdAt", "filePath", "id", "isInWatchlist", "isLiked", "lastWatched", "likedAt", "updatedAt", "watchProgress", "watchTime", "watchlistAt") SELECT "createdAt", "filePath", "id", "isInWatchlist", "isLiked", "lastWatched", "likedAt", "updatedAt", "watchProgress", "watchTime", "watchlistAt" FROM "video_progress";
DROP TABLE "video_progress";
ALTER TABLE "new_video_progress" RENAME TO "video_progress";
CREATE INDEX "video_progress_user_id_idx" ON "video_progress"("user_id");
CREATE UNIQUE INDEX "video_progress_filePath_user_id_key" ON "video_progress"("filePath", "user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "permissions_user_id_idx" ON "permissions"("user_id");

-- CreateIndex
CREATE INDEX "permissions_directory_path_idx" ON "permissions"("directory_path");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_user_id_directory_path_key" ON "permissions"("user_id", "directory_path");
