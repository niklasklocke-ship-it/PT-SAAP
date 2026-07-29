import { Injectable, Logger } from '@nestjs/common';
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
}
