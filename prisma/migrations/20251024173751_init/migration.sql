-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_revisions" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "manifest_json" JSONB NOT NULL,
    "walrus_root_uri" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_creator_id_idx" ON "assets"("creator_id");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_created_at_idx" ON "assets"("created_at");

-- CreateIndex
CREATE INDEX "asset_revisions_asset_id_idx" ON "asset_revisions"("asset_id");

-- AddForeignKey
ALTER TABLE "asset_revisions" ADD CONSTRAINT "asset_revisions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
