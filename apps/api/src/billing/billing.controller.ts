import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('subscription/status')
  getStatus(@CurrentTenant() tenant: { tenantId: string }) {
    return this.billingService.getStatus(tenant.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscription')
  createSubscription(@CurrentTenant() tenant: { tenantId: string }) {
    return this.billingService.createSubscription(tenant.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscription/cancel')
  async cancelSubscription(@CurrentTenant() tenant: { tenantId: string }) {
    await this.billingService.cancelSubscription(tenant.tenantId);
    return { cancelled: true };
  }

  // Kein JwtAuthGuard: PayPal ruft diesen Endpunkt direkt per Redirect auf,
  // ohne unseren Bearer-Token. Die Tenant-Identität kommt aus dem
  // signierten state-Parameter (siehe BillingService.createSubscription).
  @Get('callback')
  callback(@Query('state') state: string, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      this.billingService.resolveCallbackState(state);
      res.redirect(`${frontendUrl}/dashboard/profile?paypal=connected`);
    } catch {
      res.redirect(`${frontendUrl}/dashboard/profile?paypal=error`);
    }
  }

  // Kein JwtAuthGuard: PayPal ruft diesen Endpunkt direkt auf. Absicherung
  // läuft über die PayPal-Signatur-Header, geprüft gegen den unveränderten
  // Rohbody - analog zu payments.controller.ts's Stripe-Webhook.
  @Post('webhook/paypal')
  async handlePaypalWebhook(@Req() req: RawBodyRequest<Request>, @Headers() headers: Record<string, string>) {
    if (!req.rawBody) {
      throw new BadRequestException('Fehlender Request-Body');
    }
    const event = await this.billingService.verifyWebhookSignature(headers, req.rawBody);
    return this.billingService.handleWebhookEvent(event);
  }
}
