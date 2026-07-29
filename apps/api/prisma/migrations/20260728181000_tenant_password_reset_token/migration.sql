-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "passwordResetTokenHash" TEXT,
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);
