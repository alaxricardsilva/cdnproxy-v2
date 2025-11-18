/*
  Warnings:

  - You are about to drop the `NeonAuthUserSync` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "userId" TEXT;

-- DropTable
DROP TABLE "NeonAuthUserSync";

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");
