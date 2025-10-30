/*
  Warnings:

  - You are about to drop the column `root_secret_enc` on the `videos` table. All the data in the column will be lost.
  - Added the required column `dek` to the `video_segments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "videos" DROP COLUMN "root_secret_enc";

-- AlterTable
ALTER TABLE "video_segments" ADD COLUMN "dek" BYTEA NOT NULL;
