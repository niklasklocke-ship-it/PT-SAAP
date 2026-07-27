import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(@CurrentTenant() tenant: { tenantId: string }, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(tenant.tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenant: { tenantId: string }) {
    return this.servicesService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.servicesService.findOne(tenant.tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenant: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(tenant.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.servicesService.remove(tenant.tenantId, id);
  }
}
