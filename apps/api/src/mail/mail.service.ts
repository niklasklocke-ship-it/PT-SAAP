import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: parseInt(SMTP_PORT, 10) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return this.transporter;
  }

  // Ohne SMTP-Zugangsdaten (siehe .env.example) wird der Link nur geloggt,
  // damit der Reset-Flow lokal ohne echten Mailversand testbar ist -
  // gleiches Muster wie bei der Google-Calendar-Anbindung.
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(
        `SMTP nicht konfiguriert - Passwort-Reset-Link für ${to}: ${resetUrl}`,
      );
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'PT One <no-reply@pt-one.app>',
      to,
      subject: 'Passwort zurücksetzen - PT One',
      text: `Klicke auf den folgenden Link, um dein Passwort zurückzusetzen (gültig für 1 Stunde):\n\n${resetUrl}\n\nFalls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
      html: `<p>Klicke auf den folgenden Link, um dein Passwort zurückzusetzen (gültig für 1 Stunde):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>`,
    });
  }

  // Anders als beim Passwort-Reset (bewusst stiller Fallback) wirft dies bei
  // fehlendem SMTP eine klare Exception - der Trainer klickt hier aktiv auf
  // "senden" und muss ein Feedback bekommen, statt eine stillschweigend nie
  // verschickte Mail anzunehmen.
  async sendInvoiceEmail(
    to: string,
    data: {
      tenantName: string;
      customerName: string;
      invoiceNumber: string;
      amount: string;
      taxRate: string;
      issuedAt: Date;
      dueAt: Date | null;
      pdfBuffer: Buffer;
      pdfFilename: string;
    },
  ): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      throw new InternalServerErrorException(
        'E-Mail-Versand ist nicht konfiguriert (SMTP-Zugangsdaten fehlen)',
      );
    }

    const formattedDate = data.issuedAt.toLocaleDateString('de-DE');
    const dueLine = data.dueAt
      ? `Fällig am: ${data.dueAt.toLocaleDateString('de-DE')}\n`
      : '';
    const dueLineHtml = data.dueAt
      ? `<p>Fällig am: ${data.dueAt.toLocaleDateString('de-DE')}</p>`
      : '';

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'PT One <no-reply@pt-one.app>',
      to,
      subject: `Rechnung ${data.invoiceNumber} von ${data.tenantName}`,
      text:
        `Hallo ${data.customerName},\n\n` +
        `anbei die Rechnung ${data.invoiceNumber} vom ${formattedDate}.\n\n` +
        `Betrag: ${data.amount} € (zzgl. ${data.taxRate}% MwSt.)\n` +
        dueLine +
        `\nViele Grüße\n${data.tenantName}`,
      html:
        `<p>Hallo ${data.customerName},</p>` +
        `<p>anbei die Rechnung <strong>${data.invoiceNumber}</strong> vom ${formattedDate}.</p>` +
        `<p>Betrag: <strong>${data.amount} €</strong> (zzgl. ${data.taxRate}% MwSt.)</p>` +
        dueLineHtml +
        `<p>Viele Grüße<br>${data.tenantName}</p>`,
      attachments: [
        {
          filename: data.pdfFilename,
          content: data.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
