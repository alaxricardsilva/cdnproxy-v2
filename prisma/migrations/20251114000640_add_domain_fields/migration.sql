-- AlterTable
ALTER TABLE "Domain" ADD COLUMN     "expiration" TIMESTAMP(3),
ADD COLUMN     "streamBaseUrl" TEXT,
ADD COLUMN     "targetUrl" TEXT,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "url" TEXT;
