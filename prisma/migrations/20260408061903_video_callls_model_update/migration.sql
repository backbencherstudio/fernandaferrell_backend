/*
  Warnings:

  - The `status` column on the `video_calls` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updated_at` to the `video_calls` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'MISSED', 'ENDED');

-- AlterTable
ALTER TABLE "video_calls" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "CallStatus" NOT NULL DEFAULT 'PENDING';
