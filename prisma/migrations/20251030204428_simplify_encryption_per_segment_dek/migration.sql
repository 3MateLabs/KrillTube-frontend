-- AlterTable: Add dekEnc to video_segments table
-- This column stores the KMS-encrypted DEK (16 bytes) for each segment
-- Each segment now has its own independent, randomly generated encryption key
ALTER TABLE "video_segments" ADD COLUMN "dek_enc" BYTEA NOT NULL DEFAULT E'\\x00';

-- Remove the default after adding the column
-- Note: Existing rows will have default value. You'll need to re-encrypt or delete old data.
ALTER TABLE "video_segments" ALTER COLUMN "dek_enc" DROP DEFAULT;
