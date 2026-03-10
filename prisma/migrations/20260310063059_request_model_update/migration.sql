/*
  Warnings:

  - You are about to drop the column `attachmentId` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the `_AttachmentToRequest` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `request_id` to the `attachments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_AttachmentToRequest" DROP CONSTRAINT "_AttachmentToRequest_A_fkey";

-- DropForeignKey
ALTER TABLE "_AttachmentToRequest" DROP CONSTRAINT "_AttachmentToRequest_B_fkey";

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "request_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "requests" DROP COLUMN "attachmentId";

-- DropTable
DROP TABLE "_AttachmentToRequest";

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
