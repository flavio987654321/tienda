-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "closingNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "expiredNotifiedAt" TIMESTAMP(3);

