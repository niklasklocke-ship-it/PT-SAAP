import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { google, calendar_v3 } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private createOAuthClient() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  // tenantId wird als signierter, kurzlebiger state-Parameter durch den
  // Google-Redirect geschleust - der Callback läuft nicht hinter dem
  // JwtAuthGuard (Google ruft ihn direkt auf), daher diese eigene Prüfung.
  getAuthUrl(tenantId: string): string {
    const client = this.createOAuthClient();
    const state = this.jwtService.sign({ tenantId }, { expiresIn: '10m' });
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state,
    });
  }

  async handleCallback(code: string, state: string): Promise<{ tenantId: string }> {
    const { tenantId } = this.jwtService.verify<{ tenantId: string }>(state);
    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error(
        'Google hat keinen refresh_token geliefert - erneut mit prompt=consent verbinden',
      );
    }

    await this.prisma.googleCalendarConnection.upsert({
      where: { tenantId },
      create: {
        tenantId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
      },
    });

    return { tenantId };
  }

  async getStatus(tenantId: string) {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { tenantId },
    });
    return { connected: Boolean(connection), connectedAt: connection?.connectedAt ?? null };
  }

  async disconnect(tenantId: string) {
    await this.prisma.googleCalendarConnection.deleteMany({ where: { tenantId } });
  }

  // Baut einen pro Tenant autorisierten Client auf; aktualisiert bei
  // automatischem Token-Refresh (durch google-auth-library) den
  // gespeicherten accessToken. Gibt null zurück, wenn nicht verbunden -
  // Aufrufer müssen das als "nichts zu tun" behandeln, nicht als Fehler.
  private async getAuthorizedClient(tenantId: string) {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { tenantId },
    });
    if (!connection) return null;

    const client = this.createOAuthClient();
    client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.tokenExpiresAt.getTime(),
    });
    client.on('tokens', (tokens) => {
      if (!tokens.access_token) return;
      this.prisma.googleCalendarConnection
        .update({
          where: { tenantId },
          data: {
            accessToken: tokens.access_token,
            tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
          },
        })
        .catch((err) => this.logger.warn(`Token-Refresh konnte nicht gespeichert werden: ${err}`));
    });
    return client;
  }

  // --- Outbound: PT-SaaS-Termin -> Google-Event ---
  // Best-effort: Aufrufer (AppointmentsService) fangen Fehler ab, damit ein
  // Google-API-Problem nie die eigentliche Terminverwaltung blockiert.

  async createEventForAppointment(
    tenantId: string,
    appointment: { id: string; startTime: Date; endTime: Date; customerName: string; serviceName: string },
  ): Promise<string | null> {
    const client = await this.getAuthorizedClient(tenantId);
    if (!client) return null;

    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { tenantId },
    });
    const calendar = google.calendar({ version: 'v3', auth: client });
    const event = await calendar.events.insert({
      calendarId: connection!.googleCalendarId,
      requestBody: this.toGoogleEvent(appointment),
    });
    return event.data.id ?? null;
  }

  async updateEventForAppointment(
    tenantId: string,
    googleEventId: string,
    appointment: { startTime: Date; endTime: Date; customerName: string; serviceName: string },
  ): Promise<void> {
    const client = await this.getAuthorizedClient(tenantId);
    if (!client) return;

    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { tenantId },
    });
    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.events.patch({
      calendarId: connection!.googleCalendarId,
      eventId: googleEventId,
      requestBody: this.toGoogleEvent(appointment),
    });
  }

  async deleteEventForAppointment(tenantId: string, googleEventId: string): Promise<void> {
    const client = await this.getAuthorizedClient(tenantId);
    if (!client) return;

    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { tenantId },
    });
    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.events.delete({
      calendarId: connection!.googleCalendarId,
      eventId: googleEventId,
    });
  }

  private toGoogleEvent(appointment: {
    startTime: Date;
    endTime: Date;
    customerName: string;
    serviceName: string;
  }): calendar_v3.Schema$Event {
    return {
      summary: `${appointment.serviceName} – ${appointment.customerName}`,
      start: { dateTime: appointment.startTime.toISOString() },
      end: { dateTime: appointment.endTime.toISOString() },
    };
  }

  // --- Inbound: Änderungen aus Google zurück in PT-SaaS übernehmen ---
  // Bewusst nur für Termine, die schon einen googleEventId haben (also
  // ursprünglich aus PT-SaaS stammen) - ein komplett neu in Google
  // angelegtes Event kann nicht automatisch einem Kunden/einer Leistung
  // zugeordnet werden, das bräuchte eine manuelle Trainer-Entscheidung.
  // Kein automatischer Hintergrund-Job (bräuchte Webhooks mit öffentlich
  // erreichbarer HTTPS-Callback-URL oder Polling-Scheduler) - für's MVP
  // über den "Jetzt synchronisieren"-Button manuell angestoßen.
  async syncFromGoogle(tenantId: string): Promise<{ updated: number; cancelled: number }> {
    const client = await this.getAuthorizedClient(tenantId);
    if (!client) return { updated: 0, cancelled: 0 };

    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { tenantId },
    });
    const calendar = google.calendar({ version: 'v3', auth: client });

    const listParams: calendar_v3.Params$Resource$Events$List = {
      calendarId: connection!.googleCalendarId,
      singleEvents: true,
    };
    if (connection!.syncToken) {
      listParams.syncToken = connection!.syncToken;
    } else {
      listParams.timeMin = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    }

    const response = await calendar.events.list(listParams);
    let updated = 0;
    let cancelled = 0;

    for (const event of response.data.items ?? []) {
      if (!event.id) continue;
      const appointment = await this.prisma.appointment.findUnique({
        where: { googleEventId: event.id },
      });
      if (!appointment || appointment.tenantId !== tenantId) continue;

      if (event.status === 'cancelled') {
        await this.prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: 'CANCELLED' },
        });
        cancelled += 1;
        continue;
      }

      const newStart = event.start?.dateTime ? new Date(event.start.dateTime) : null;
      const newEnd = event.end?.dateTime ? new Date(event.end.dateTime) : null;
      if (newStart && newEnd) {
        await this.prisma.appointment.update({
          where: { id: appointment.id },
          data: { startTime: newStart, endTime: newEnd },
        });
        updated += 1;
      }
    }

    if (response.data.nextSyncToken) {
      await this.prisma.googleCalendarConnection.update({
        where: { tenantId },
        data: { syncToken: response.data.nextSyncToken },
      });
    }

    return { updated, cancelled };
  }
}
