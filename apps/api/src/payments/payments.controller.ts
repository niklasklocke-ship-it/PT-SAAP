import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('invoice/:invoiceId')
  findAllForInvoice(
    @CurrentTenant() tenant: { tenantId: string },
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.paymentsService.findAllForInvoice(tenant.tenantId, invoiceId);
  }

  // Kein JwtAuthGuard: Stripe ruft diesen Endpunkt direkt auf.
  // Absicherung läuft stattdessen über die Stripe-Signatur im Header
  // "stripe-signature", geprüft gegen den unveränderten Rohbody.
  @Post('webhook/stripe')
  handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Fehlender Request-Body oder Signatur-Header');
    }
    const event = this.paymentsService.verifyWebhookSignature(req.rawBody, signature);
    return this.paymentsService.handleStripeEvent(event);
  }
}
