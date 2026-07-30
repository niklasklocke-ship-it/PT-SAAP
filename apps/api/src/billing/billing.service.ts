import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PAYPAL_API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

interface PaypalSubscription {
  id: string;
  status: string;
  links: { rel: string; href: string }[];
}

// Zahlt das eigene PT-One-Abo des Trainers per PayPal Subscriptions ab - nicht
// zu verwechseln mit payments/ (Stripe), das Rechnungen der Kunden des
// Trainers abwickelt.
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private cachedToken: CachedToken | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private get apiBase(): string {
    return process.env.PAYPAL_ENV === 'live' ? PAYPAL_API_BASE.live : PAYPAL_API_BASE.sandbox;
  }

  private assertConfigured() {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      throw new InternalServerErrorException(
        'PayPal ist nicht konfiguriert (PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET fehlen)',
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    this.assertConfigured();
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 30_000) {
      return this.cachedToken.accessToken;
    }
    const credentials = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
    ).toString('base64');
    const response = await fetch(`${this.apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new InternalServerErrorException(
        `PayPal-OAuth fehlgeschlagen: ${response.status} ${await response.text()}`,
      );
    }
    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.cachedToken.accessToken;
  }

  private async paypalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.apiBase}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    if (!response.ok) {
      throw new InternalServerErrorException(
        `PayPal-API-Fehler (${path}): ${response.status} ${await response.text()}`,
      );
    }
    return response.status === 204 ? (null as T) : ((await response.json()) as T);
  }

  async getStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCancelledAt: true,
        paypalPlanId: true,
      },
    });
    if (!tenant) {
      throw new NotFoundException('Trainer nicht gefunden');
    }
    return tenant;
  }

  // tenantId reist als signierter state-Query-Param im return_url durch den
  // PayPal-Redirect zurück zu unserem eigenen Callback - gleiche Idee wie
  // beim Google-Calendar-OAuth (getAuthUrl/handleCallback in
  // google-calendar.service.ts), da PayPal den Callback ohne unseren
  // Bearer-Token aufruft.
  async createSubscription(tenantId: string): Promise<{ approveUrl: string }> {
    const planId = process.env.PAYPAL_PLAN_ID_PRO_MONTHLY;
    if (!planId) {
      throw new InternalServerErrorException('PAYPAL_PLAN_ID_PRO_MONTHLY ist nicht konfiguriert');
    }
    const state = this.jwtService.sign({ tenantId }, { expiresIn: '15m' });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const apiUrl = process.env.API_URL || 'http://localhost:3001';

    const subscription = await this.paypalFetch<PaypalSubscription>('/v1/billing/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        application_context: {
          brand_name: 'PT One',
          return_url: `${apiUrl}/billing/callback?state=${encodeURIComponent(state)}`,
          cancel_url: `${frontendUrl}/dashboard/profile?paypal=cancelled`,
          user_action: 'SUBSCRIBE_NOW',
        },
      }),
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        paypalSubscriptionId: subscription.id,
        paypalPlanId: planId,
        subscriptionStatus: 'PENDING',
      },
    });

    const approveLink = subscription.links.find((link) => link.rel === 'approve');
    if (!approveLink) {
      throw new InternalServerErrorException('PayPal hat keinen Approval-Link geliefert');
    }
    return { approveUrl: approveLink.href };
  }

  // Reiner Redirect-Handler: bestätigt nur, dass der state-Token gültig ist
  // (also die Rückkehr von PayPal wirklich zu diesem Tenant gehört). Die
  // eigentliche Statusänderung übernimmt der Webhook (handleWebhookEvent) -
  // der ist die verlässliche Quelle, da PayPal den Redirect auch bei
  // Nutzerabbruch aufrufen kann.
  resolveCallbackState(state: string): { tenantId: string } {
    try {
      return this.jwtService.verify<{ tenantId: string }>(state);
    } catch {
      throw new BadRequestException('Ungültiger oder abgelaufener state-Parameter');
    }
  }

  async cancelSubscription(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.paypalSubscriptionId) {
      throw new BadRequestException('Kein aktives PayPal-Abo vorhanden');
    }
    await this.paypalFetch(`/v1/billing/subscriptions/${tenant.paypalSubscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Vom Trainer gekündigt' }),
    });
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { subscriptionStatus: 'CANCELLED', subscriptionCancelledAt: new Date() },
    });
  }

  // PayPal-Analogon zu Stripes stripe.webhooks.constructEvent: statt lokaler
  // HMAC-Prüfung ruft man PayPals eigenen Verify-Endpunkt mit dem Rohbody +
  // den paypal-*-Headern auf.
  async verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<Record<string, unknown>> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      throw new InternalServerErrorException('PAYPAL_WEBHOOK_ID ist nicht konfiguriert');
    }
    const event = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    const verification = await this.paypalFetch<{ verification_status: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: JSON.stringify({
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: event,
        }),
      },
    );
    if (verification.verification_status !== 'SUCCESS') {
      throw new BadRequestException('Ungültige PayPal-Webhook-Signatur');
    }
    return event;
  }

  async handleWebhookEvent(event: Record<string, unknown>) {
    const resource = (event.resource ?? {}) as Record<string, unknown>;
    const subscriptionId = (resource.id ?? resource.billing_agreement_id) as string | undefined;
    const eventType = event.event_type as string | undefined;

    if (!subscriptionId || !eventType) {
      return { received: true, ignored: eventType };
    }

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const billingInfo = resource.billing_info as { next_billing_time?: string } | undefined;
        await this.updateBySubscriptionId(subscriptionId, {
          subscriptionStatus: 'ACTIVE',
          subscriptionCurrentPeriodEnd: billingInfo?.next_billing_time
            ? new Date(billingInfo.next_billing_time)
            : undefined,
        });
        break;
      }
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await this.updateBySubscriptionId(subscriptionId, { subscriptionStatus: 'SUSPENDED' });
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await this.updateBySubscriptionId(subscriptionId, {
          subscriptionStatus: 'CANCELLED',
          subscriptionCancelledAt: new Date(),
        });
        break;
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await this.updateBySubscriptionId(subscriptionId, { subscriptionStatus: 'EXPIRED' });
        break;
      case 'PAYMENT.SALE.COMPLETED':
        // Erfolgreiche Abbuchung einer Verlängerung - Abo bleibt/wird aktiv.
        await this.updateBySubscriptionId(subscriptionId, { subscriptionStatus: 'ACTIVE' });
        break;
      default:
        // Andere Event-Typen sind fürs MVP nicht relevant - trotzdem mit
        // 200 bestätigen, sonst wiederholt PayPal den Webhook-Call.
        return { received: true, ignored: eventType };
    }
    return { received: true };
  }

  private async updateBySubscriptionId(
    paypalSubscriptionId: string,
    data: Prisma.TenantUpdateInput,
  ) {
    const result = await this.prisma.tenant.updateMany({
      where: { paypalSubscriptionId },
      data,
    });
    if (result.count === 0) {
      this.logger.warn(
        `PayPal-Webhook für unbekannte subscriptionId ${paypalSubscriptionId} empfangen`,
      );
    }
  }
}
