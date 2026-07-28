import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Stripe = require('stripe');
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    // Ohne echten Key läuft der Stripe-Client trotzdem an (nur zum
    // Signatur-Verify wird er gebraucht, nicht für ausgehende API-Calls).
    this.stripe = new Stripe(secretKey || 'sk_test_placeholder');
  }

  findAllForInvoice(tenantId: string, invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoiceId, invoice: { tenantId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Prüft, dass der Webhook-Body wirklich von Stripe stammt und nicht
  // manipuliert wurde (HMAC-Signaturprüfung gegen den Rohbody).
  verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET ist nicht konfiguriert');
    }
    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Ungültige Stripe-Signatur: ${(err as Error).message}`);
    }
  }

  // Verarbeitet ein bereits signaturgeprüftes Stripe-Event. Die
  // PaymentIntent-Metadata muss "invoiceId" enthalten (beim Erstellen des
  // PaymentIntent zu setzen: stripe.paymentIntents.create({ metadata: { invoiceId } })).
  handleStripeEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const invoiceId = paymentIntent.metadata?.invoiceId;
        if (!invoiceId) {
          throw new BadRequestException(
            'PaymentIntent hat keine invoiceId in den Metadata',
          );
        }
        return this.recordFromWebhook({
          invoiceId,
          provider: 'stripe',
          providerTransactionId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          succeeded: event.type === 'payment_intent.succeeded',
        });
      }
      default:
        // Andere Event-Typen sind fürs MVP nicht relevant - trotzdem mit
        // 200 bestätigen, sonst wiederholt Stripe den Webhook-Call.
        return { received: true, ignored: event.type };
    }
  }

  async recordFromWebhook(params: {
    invoiceId: string;
    provider: string;
    providerTransactionId: string;
    amount: number;
    succeeded: boolean;
  }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: params.invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('Rechnung für Zahlung nicht gefunden');
    }

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: params.invoiceId,
        provider: params.provider,
        providerTransactionId: params.providerTransactionId,
        amount: params.amount,
        status: params.succeeded ? 'SUCCEEDED' : 'FAILED',
        paidAt: params.succeeded ? new Date() : undefined,
      },
    });

    if (params.succeeded) {
      await this.prisma.invoice.update({
        where: { id: params.invoiceId },
        data: { status: 'PAID' },
      });
    }

    return payment;
  }
}
