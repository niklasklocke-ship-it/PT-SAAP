import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@CurrentTenant() tenant: { tenantId: string }) {
    return this.googleCalendarService.getStatus(tenant.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('connect')
  connect(@CurrentTenant() tenant: { tenantId: string }) {
    return { url: this.googleCalendarService.getAuthUrl(tenant.tenantId) };
  }

  // Kein JwtAuthGuard: Google ruft diesen Endpunkt direkt per Redirect auf,
  // ohne unseren Bearer-Token. Die Tenant-Identität kommt stattdessen aus
  // dem signierten state-Parameter (siehe getAuthUrl/handleCallback).
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      await this.googleCalendarService.handleCallback(code, state);
      res.redirect(`${frontendUrl}/dashboard/calendar?google=connected`);
    } catch {
      res.redirect(`${frontendUrl}/dashboard/calendar?google=error`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('disconnect')
  async disconnect(@CurrentTenant() tenant: { tenantId: string }) {
    await this.googleCalendarService.disconnect(tenant.tenantId);
    return { connected: false };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  sync(@CurrentTenant() tenant: { tenantId: string }) {
    return this.googleCalendarService.syncFromGoogle(tenant.tenantId);
  }
}
