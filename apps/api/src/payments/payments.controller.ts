import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { PaymentsService } from './payments.service';
import { StripeWebhookDto } from './dto/stripe-webhook.dto';

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
  // Absicherung läuft stattdessen über die Stripe-Signatur (noch TODO).
  @Post('webhook/stripe')
  handleStripeWebhook(@Body() dto: StripeWebhookDto) {
    return this.paymentsService.recordFromWebhook({
      invoiceId: dto.invoiceId,
      provider: 'stripe',
      providerTransactionId: dto.providerTransactionId,
      amount: dto.amount,
      succeeded: dto.succeeded,
    });
  }
}
