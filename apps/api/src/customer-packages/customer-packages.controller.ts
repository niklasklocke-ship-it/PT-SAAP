import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CustomerPackagesService } from './customer-packages.service';
import { CreateCustomerPackageDto } from './dto/create-customer-package.dto';

@UseGuards(JwtAuthGuard)
@Controller('customer-packages')
export class CustomerPackagesController {
  constructor(private readonly service: CustomerPackagesService) {}

  @Post()
  create(@CurrentTenant() tenant: { tenantId: string }, @Body() dto: CreateCustomerPackageDto) {
    return this.service.create(tenant.tenantId, dto);
  }

  @Get('customer/:customerId')
  findAllForCustomer(
    @CurrentTenant() tenant: { tenantId: string },
    @Param('customerId') customerId: string,
  ) {
    return this.service.findAllForCustomer(tenant.tenantId, customerId);
  }

  @Post(':id/consume')
  consume(@CurrentTenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.service.consumeSession(tenant.tenantId, id);
  }
}
