import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForInvoice(tenantId: string, invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoiceId, invoice: { tenantId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Wird vom Stripe-Webhook (payment_intent.succeeded / .payment_failed)
  // aufgerufen. providerTransactionId = Stripe PaymentIntent-ID.
  // TODO: echte Stripe-Signaturprüfung ergänzen, bevor das produktiv läuft.
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
