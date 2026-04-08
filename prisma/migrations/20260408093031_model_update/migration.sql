/*
  Warnings:

  - You are about to drop the `video_calls` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('AUDIO', 'VIDEO');

-- DropTable
DROP TABLE "video_calls";

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "caller_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "call_type" "CallType" NOT NULL DEFAULT 'VIDEO',
    "status" "CallStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calls_room_name_key" ON "calls"("room_name");

-- CreateIndex
CREATE INDEX "calls_caller_id_receiver_id_idx" ON "calls"("caller_id", "receiver_id");
