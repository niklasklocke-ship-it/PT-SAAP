import { IsBoolean, IsNumber, IsString } from 'class-validator';

// Vereinfachtes Webhook-Payload-Format fürs MVP. In Produktion würde
// hier stattdessen der rohe Stripe-Event-Body inkl. Signaturprüfung
// verarbeitet werden (stripe.webhooks.constructEvent).
export class StripeWebhookDto {
  @IsString()
  invoiceId: string;

  @IsString()
  providerTransactionId: string;

  @IsNumber()
  amount: number;

  @IsBoolean()
  succeeded: boolean;
}
