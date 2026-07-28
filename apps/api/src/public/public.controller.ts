import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { PublicService } from './public.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

// Alle Endpunkte hier werden vom Website-Widget und der Kunden-App
// aufgerufen - abgesichert über den öffentlichen API-Key des Trainers,
// nicht über einen Login (siehe ApiKeyGuard).
@UseGuards(ApiKeyGuard)
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('services')
  listServices(@CurrentTenant() tenant: { tenantId: string }) {
    return this.publicService.listServices(tenant.tenantId);
  }

  @Get('availability')
  getBusySlots(
    @CurrentTenant() tenant: { tenantId: string },
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.publicService.getBusySlots(tenant.tenantId, query.from, query.to);
  }

  @Post('appointments')
  book(@CurrentTenant() tenant: { tenantId: string }, @Body() dto: CreatePublicBookingDto) {
    return this.publicService.book(tenant.tenantId, dto);
  }
}
