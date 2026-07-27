import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  // Bewusst nur die Felder, die ein Endkunde sehen darf - keine
  // internen Preise Dritter oder Trainer-Interna.
  listServices(tenantId: string) {
    return this.prisma.service.findMany({
      where: { tenantId },
      select: { id: true, name: true, price: true, durationMin: true, type: true },
      orderBy: { name: 'asc' },
    });
  }

  // Liefert bereits belegte Zeiträume, damit das Widget freie Slots
  // client-seitig berechnen kann, ohne interne Kundendaten preiszugeben.
  async getBusySlots(tenantId: string, from: string, to: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: { in: ['BOOKED', 'COMPLETED'] },
        startTime: { gte: new Date(from) },
        endTime: { lte: new Date(to) },
      },
      select: { startTime: true, endTime: true },
    });
    return appointments;
  }

  // Legt bei Bedarf einen neuen Kunden an (per E-Mail identifiziert)
  // und bucht anschließend den Termin über den bestehenden Service,
  // damit die Überschneidungsprüfung zentral bleibt.
  async book(tenantId: string, dto: CreatePublicBookingDto) {
    let customer = await this.prisma.customer.findFirst({
      where: { tenantId, email: dto.customerEmail },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          tenantId,
          name: dto.customerName,
          email: dto.customerEmail,
          phone: dto.customerPhone,
        },
      });
    }

    return this.appointmentsService.create(tenantId, {
      customerId: customer.id,
      serviceId: dto.serviceId,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
  }
}
