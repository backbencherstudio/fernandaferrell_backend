/*
  Warnings:

  - You are about to drop the column `viewer_count` on the `live_streams` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "live_streams_host_id_idx";

-- AlterTable
ALTER TABLE "live_streams" DROP COLUMN "viewer_count";

-- AddForeignKey
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
