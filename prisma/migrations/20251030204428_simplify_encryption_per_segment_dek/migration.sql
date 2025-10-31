-- AlterTable: Remove rootSecretEnc from videos table
-- This column stored the KMS-encrypted root secret (32 bytes) used to derive segment DEKs
-- With the new approach, each segment has its own independent DEK stored in video_segments
ALTER TABLE "videos" DROP COLUMN "root_secret_enc";

-- AlterTable: Add dekEnc to video_segments table
-- This column stores the KMS-encrypted DEK (16 bytes) for each segment
-- Each segment now has its own independent, randomly generated encryption key
ALTER TABLE "video_segments" ADD COLUMN "dek_enc" BYTEA NOT NULL DEFAULT E'\\x00';

-- Remove the default after adding the column
-- Note: Existing rows will have default value. You'll need to re-encrypt or delete old data.
ALTER TABLE "video_segments" ALTER COLUMN "dek_enc" DROP DEFAULT;
