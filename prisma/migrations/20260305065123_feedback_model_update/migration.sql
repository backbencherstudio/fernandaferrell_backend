/*
  Warnings:

  - The `rating_type` column on the `feedbacks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "feedbacks" DROP COLUMN "rating_type",
ADD COLUMN     "rating_type" BOOLEAN;
