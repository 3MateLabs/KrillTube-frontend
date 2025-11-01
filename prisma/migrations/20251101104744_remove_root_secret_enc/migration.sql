-- Remove root_secret_enc column from videos table
ALTER TABLE "videos" DROP COLUMN IF EXISTS "root_secret_enc";