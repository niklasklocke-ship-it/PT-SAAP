import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

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
      include: { customer: true, payments: true },
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
}
