/*
  Warnings:

  - You are about to drop the column `server_priv_jwk` on the `playback_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "playback_sessions" DROP COLUMN "server_priv_jwk";
