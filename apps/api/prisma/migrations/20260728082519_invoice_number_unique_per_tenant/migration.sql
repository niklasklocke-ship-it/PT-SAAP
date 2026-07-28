-- DropIndex
DROP INDEX "invoices_invoiceNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenantId_invoiceNumber_key" ON "invoices"("tenantId", "invoiceNumber");
