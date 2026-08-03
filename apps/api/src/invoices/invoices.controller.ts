import { Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  create(@CurrentTenant() tenant: { tenantId: string }, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(tenant.tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenant: { tenantId: string }) {
    return this.invoicesService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.invoicesService.findOne(tenant.tenantId, id);
  }

  @Patch(':id/cancel')
  cancel(@CurrentTenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.invoicesService.markStatus(tenant.tenantId, id, 'CANCELLED');
  }

  @Post(':id/send-email')
  sendEmail(@CurrentTenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.invoicesService.sendByEmail(tenant.tenantId, id);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @CurrentTenant() tenant: { tenantId: string },
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename } = await this.invoicesService.getPdf(tenant.tenantId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }
}
