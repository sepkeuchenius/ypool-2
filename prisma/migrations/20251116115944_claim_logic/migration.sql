/*
  Warnings:

  - A unique constraint covering the columns `[claimedById]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "claimedById" TEXT,
ADD COLUMN     "ghost" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_claimedById_key" ON "User"("claimedById");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
