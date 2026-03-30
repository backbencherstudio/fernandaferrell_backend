-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "latest_news" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "message" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sign_of_disaster" BOOLEAN NOT NULL DEFAULT true;
