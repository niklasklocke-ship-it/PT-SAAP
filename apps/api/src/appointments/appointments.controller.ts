import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@CurrentTenant() tenant: { tenantId: string }, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(tenant.tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenant: { tenantId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.appointmentsService.findAll(tenant.tenantId, from, to);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.appointmentsService.findOne(tenant.tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenant: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(tenant.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.appointmentsService.remove(tenant.tenantId, id);
  }
}
