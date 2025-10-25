/*
  Warnings:

  - Added the required column `creator_id` to the `videos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "creator_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "videos_creator_id_idx" ON "videos"("creator_id");
