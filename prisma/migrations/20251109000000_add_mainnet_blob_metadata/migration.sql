-- Add blob metadata columns for mainnet storage management
-- Only applicable to videos on network='mainnet'

ALTER TABLE "videos" ADD COLUMN "master_blob_object_id" TEXT;
ALTER TABLE "videos" ADD COLUMN "master_end_epoch" INTEGER;
ALTER TABLE "videos" ADD COLUMN "poster_blob_object_id" TEXT;
ALTER TABLE "videos" ADD COLUMN "poster_end_epoch" INTEGER;

ALTER TABLE "video_renditions" ADD COLUMN "playlist_blob_object_id" TEXT;
ALTER TABLE "video_renditions" ADD COLUMN "playlist_end_epoch" INTEGER;

ALTER TABLE "video_segments" ADD COLUMN "blob_object_id" TEXT;
ALTER TABLE "video_segments" ADD COLUMN "end_epoch" INTEGER;

-- Add indexes for efficient queries
CREATE INDEX "videos_master_blob_object_id_idx" ON "videos"("master_blob_object_id") WHERE "network" = 'mainnet';
CREATE INDEX "videos_master_end_epoch_idx" ON "videos"("master_end_epoch") WHERE "network" = 'mainnet';
CREATE INDEX "video_renditions_playlist_blob_object_id_idx" ON "video_renditions"("playlist_blob_object_id");
CREATE INDEX "video_segments_blob_object_id_idx" ON "video_segments"("blob_object_id");

COMMENT ON COLUMN "videos"."master_blob_object_id" IS 'Sui blob object ID for master playlist (mainnet only)';
COMMENT ON COLUMN "videos"."master_end_epoch" IS 'Walrus storage expiry epoch for master playlist (mainnet only)';
COMMENT ON COLUMN "videos"."poster_blob_object_id" IS 'Sui blob object ID for poster image (mainnet only)';
COMMENT ON COLUMN "videos"."poster_end_epoch" IS 'Walrus storage expiry epoch for poster (mainnet only)';
COMMENT ON COLUMN "video_renditions"."playlist_blob_object_id" IS 'Sui blob object ID for rendition playlist (mainnet only)';
COMMENT ON COLUMN "video_renditions"."playlist_end_epoch" IS 'Walrus storage expiry epoch for playlist (mainnet only)';
COMMENT ON COLUMN "video_segments"."blob_object_id" IS 'Sui blob object ID for segment (mainnet only)';
COMMENT ON COLUMN "video_segments"."end_epoch" IS 'Walrus storage expiry epoch for segment (mainnet only)';
