import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Prüft, ob sich der neue Termin mit einem bestehenden, aktiven
  // Termin desselben Trainers überschneidet.
  private async assertNoOverlap(
    tenantId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ) {
    const overlapping = await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        status: { in: ['BOOKED', 'COMPLETED'] },
        id: excludeId ? { not: excludeId } : undefined,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (overlapping) {
      throw new BadRequestException('Zeitfenster ist bereits belegt');
    }
  }

  async create(tenantId: string, dto: CreateAppointmentDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (endTime <= startTime) {
      throw new BadRequestException('endTime muss nach startTime liegen');
    }
    await this.assertNoOverlap(tenantId, startTime, endTime);

    return this.prisma.appointment.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        startTime,
        endTime,
      },
      include: { customer: true, service: true },
    });
  }

  // Optionaler Zeitraumfilter fürs Kalender-Widget (?from=...&to=...)
  findAll(tenantId: string, from?: string, to?: string) {
    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        ...(from || to
          ? {
              startTime: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { customer: true, service: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: { customer: true, service: true, invoice: true },
    });
    if (!appointment) {
      throw new NotFoundException('Termin nicht gefunden');
    }
    return appointment;
  }

  async update(tenantId: string, id: string, dto: UpdateAppointmentDto) {
    const existing = await this.findOne(tenantId, id);

    const startTime = dto.startTime ? new Date(dto.startTime) : existing.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : existing.endTime;

    if (dto.startTime || dto.endTime) {
      if (endTime <= startTime) {
        throw new BadRequestException('endTime muss nach startTime liegen');
      }
      await this.assertNoOverlap(tenantId, startTime, endTime, id);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        startTime,
        endTime,
        status: dto.status ?? existing.status,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.appointment.delete({ where: { id } });
  }
}
