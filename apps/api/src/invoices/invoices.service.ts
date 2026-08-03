import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  // Fortlaufende Rechnungsnummer pro Trainer und Jahr, z.B. "2026-0007".
  // Für GoBD muss diese lückenlos sein. Die Zählung + das Anlegen der
  // Rechnung laufen daher in derselben DB-Transaktion, serialisiert per
  // Postgres Advisory-Lock (pro Tenant + Jahr) - parallele Requests
  // desselben Trainers warten hier aufeinander statt gleichzeitig
  // dieselbe Nummer zu berechnen.
  private async generateInvoiceNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`invoice-number:${tenantId}:${year}`}, 0))`;

    const count = await tx.invoice.count({
      where: {
        tenantId,
        issuedAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        },
      },
    });
    const sequence = String(count + 1).padStart(4, '0');
    return `${year}-${sequence}`;
  }

  async create(tenantId: string, dto: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Kunde nicht gefunden');
    }

    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, tenantId },
      });
      if (!appointment) {
        throw new NotFoundException('Termin nicht gefunden');
      }
      const existingInvoice = await this.prisma.invoice.findUnique({
        where: { appointmentId: dto.appointmentId },
      });
      if (existingInvoice) {
        throw new ConflictException('Für diesen Termin existiert bereits eine Rechnung');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(tx, tenantId);

      return tx.invoice.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          appointmentId: dto.appointmentId,
          invoiceNumber,
          amount: dto.amount,
          taxRate: dto.taxRate ?? 0,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        },
      });
    });
  }

  findAll(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      include: { customer: true, payments: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { customer: true, payments: true, appointment: { include: { service: true } } },
    });
    if (!invoice) {
      throw new NotFoundException('Rechnung nicht gefunden');
    }
    return invoice;
  }

  async markStatus(tenantId: string, id: string, status: 'PAID' | 'OVERDUE' | 'CANCELLED') {
    await this.findOne(tenantId, id);
    return this.prisma.invoice.update({ where: { id }, data: { status } });
  }

  private async buildInvoicePdf(tenantId: string, id: string) {
    const invoice = await this.findOne(tenantId, id);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Trainer nicht gefunden');
    }

    const buffer = await this.invoicePdfService.generate({
      tenantName: tenant.name,
      tenantTaxId: tenant.taxId,
      customerName: invoice.customer.name,
      customerEmail: invoice.customer.email,
      invoiceNumber: invoice.invoiceNumber,
      serviceName: invoice.appointment?.service.name ?? null,
      amount: invoice.amount.toString(),
      taxRate: invoice.taxRate.toString(),
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      dueAt: invoice.dueAt,
    });
    const filename = `Rechnung-${invoice.invoiceNumber}.pdf`;

    return { buffer, filename, invoice, tenant };
  }

  async getPdf(tenantId: string, id: string) {
    const { buffer, filename } = await this.buildInvoicePdf(tenantId, id);
    return { buffer, filename };
  }

  async sendByEmail(tenantId: string, id: string) {
    const { buffer, filename, invoice, tenant } = await this.buildInvoicePdf(tenantId, id);
    if (!invoice.customer.email) {
      throw new BadRequestException('Kunde hat keine E-Mail-Adresse hinterlegt');
    }

    await this.mailService.sendInvoiceEmail(invoice.customer.email, {
      tenantName: tenant.name,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount.toString(),
      taxRate: invoice.taxRate.toString(),
      issuedAt: invoice.issuedAt,
      dueAt: invoice.dueAt,
      pdfBuffer: buffer,
      pdfFilename: filename,
    });

    // Vermerk erst NACH erfolgreichem Versand setzen - schlägt sendInvoiceEmail
    // fehl (z.B. SMTP nicht konfiguriert), bleibt emailSentAt bewusst null.
    await this.prisma.invoice.update({ where: { id }, data: { emailSentAt: new Date() } });

    return { sent: true };
  }
}
