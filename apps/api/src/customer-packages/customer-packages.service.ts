import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerPackageDto } from './dto/create-customer-package.dto';

@Injectable()
export class CustomerPackagesService {
  constructor(private readonly prisma: PrismaService) {}

  // Pakete/Abos gehören zu Kunden, die wiederum zu einem Tenant gehören -
  // daher hier über die Kunden-Relation auf tenantId prüfen. Zusätzlich
  // muss auch die referenzierte Leistung (serviceId) zum selben Tenant
  // gehören, sonst könnte ein Trainer ein Paket auf eine fremde Leistung
  // ausstellen.
  async create(tenantId: string, dto: CreateCustomerPackageDto) {
    const [customer, service] = await Promise.all([
      this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } }),
      this.prisma.service.findFirst({ where: { id: dto.serviceId, tenantId } }),
    ]);
    if (!customer) {
      throw new NotFoundException('Kunde nicht gefunden');
    }
    if (!service) {
      throw new NotFoundException('Leistung nicht gefunden');
    }

    return this.prisma.customerPackage.create({
      data: {
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        remainingSessions: dto.remainingSessions,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  findAllForCustomer(tenantId: string, customerId: string) {
    return this.prisma.customerPackage.findMany({
      where: { customerId, customer: { tenantId } },
      include: { service: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Wird nach einem abgehaltenen Training aufgerufen, um ein Guthaben
  // aus einer 10er-Karte/einem Abo zu verbrauchen.
  async consumeSession(tenantId: string, packageId: string) {
    const pkg = await this.prisma.customerPackage.findFirst({
      where: { id: packageId, customer: { tenantId } },
    });
    if (!pkg) {
      throw new NotFoundException('Paket nicht gefunden');
    }
    if (pkg.remainingSessions <= 0) {
      throw new NotFoundException('Keine Einheiten mehr übrig');
    }
    return this.prisma.customerPackage.update({
      where: { id: packageId },
      data: { remainingSessions: { decrement: 1 } },
    });
  }
}
