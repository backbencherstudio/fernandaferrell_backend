-- AlterTable
ALTER TABLE "live_streams" ADD COLUMN     "ended_at" TIMESTAMP(3),
ADD COLUMN     "recording_url" TEXT;
