-- CreateTable
CREATE TABLE "live_streams" (
    "id" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "title" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "viewer_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_streams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "live_streams_room_name_key" ON "live_streams"("room_name");

-- CreateIndex
CREATE INDEX "live_streams_host_id_idx" ON "live_streams"("host_id");
