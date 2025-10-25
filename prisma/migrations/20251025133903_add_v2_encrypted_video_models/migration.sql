-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "walrus_master_uri" TEXT NOT NULL,
    "poster_walrus_uri" TEXT,
    "root_secret_enc" BYTEA NOT NULL,
    "duration" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_renditions" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "walrus_playlist_uri" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "bitrate" INTEGER NOT NULL,

    CONSTRAINT "video_renditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_segments" (
    "id" TEXT NOT NULL,
    "rendition_id" TEXT NOT NULL,
    "seg_idx" INTEGER NOT NULL,
    "walrus_uri" TEXT NOT NULL,
    "iv" BYTEA NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "video_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playback_sessions" (
    "id" TEXT NOT NULL,
    "cookie_value" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "client_pub_key" BYTEA NOT NULL,
    "server_pub_key" BYTEA NOT NULL,
    "server_priv_jwk" TEXT NOT NULL,
    "server_nonce" BYTEA NOT NULL,
    "device_hash" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playback_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playback_logs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "seg_idx" INTEGER NOT NULL,
    "rendition" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "playback_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_renditions_video_id_name_key" ON "video_renditions"("video_id", "name");

-- CreateIndex
CREATE INDEX "video_segments_rendition_id_idx" ON "video_segments"("rendition_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_segments_rendition_id_seg_idx_key" ON "video_segments"("rendition_id", "seg_idx");

-- CreateIndex
CREATE UNIQUE INDEX "playback_sessions_cookie_value_key" ON "playback_sessions"("cookie_value");

-- CreateIndex
CREATE INDEX "playback_sessions_cookie_value_idx" ON "playback_sessions"("cookie_value");

-- CreateIndex
CREATE INDEX "playback_sessions_video_id_idx" ON "playback_sessions"("video_id");

-- CreateIndex
CREATE INDEX "playback_sessions_expires_at_idx" ON "playback_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "playback_logs_session_id_idx" ON "playback_logs"("session_id");

-- CreateIndex
CREATE INDEX "playback_logs_video_id_idx" ON "playback_logs"("video_id");

-- CreateIndex
CREATE INDEX "playback_logs_timestamp_idx" ON "playback_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "video_renditions" ADD CONSTRAINT "video_renditions_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_segments" ADD CONSTRAINT "video_segments_rendition_id_fkey" FOREIGN KEY ("rendition_id") REFERENCES "video_renditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
