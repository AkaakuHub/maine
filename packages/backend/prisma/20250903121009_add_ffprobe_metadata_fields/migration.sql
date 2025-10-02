-- AlterTable
ALTER TABLE "video_metadata" ADD COLUMN "duration" INTEGER;
ALTER TABLE "video_metadata" ADD COLUMN "metadata_extracted_at" DATETIME;
ALTER TABLE "video_metadata" ADD COLUMN "thumbnail_path" TEXT;
