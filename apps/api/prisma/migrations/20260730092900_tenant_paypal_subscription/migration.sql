-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "paypalPlanId" TEXT,
ADD COLUMN     "paypalSubscriptionId" TEXT,
ADD COLUMN     "subscriptionCancelledAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE UNIQUE INDEX "tenants_paypalSubscriptionId_key" ON "tenants"("paypalSubscriptionId");
