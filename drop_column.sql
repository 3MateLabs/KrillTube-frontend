-- Drop root_secret_enc column completely
ALTER TABLE "videos" DROP COLUMN IF EXISTS "root_secret_enc";
