import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
}
