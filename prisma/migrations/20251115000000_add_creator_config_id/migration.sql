-- AlterTable
ALTER TABLE "videos" ADD COLUMN "creator_config_id" TEXT;

-- CreateIndex
CREATE INDEX "videos_creator_config_id_idx" ON "videos"("creator_config_id");
