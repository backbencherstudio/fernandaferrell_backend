-- CreateTable
CREATE TABLE "video_calls" (
    "id" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "caller_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "video_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_calls_room_name_key" ON "video_calls"("room_name");

-- CreateIndex
CREATE INDEX "video_calls_caller_id_receiver_id_idx" ON "video_calls"("caller_id", "receiver_id");
