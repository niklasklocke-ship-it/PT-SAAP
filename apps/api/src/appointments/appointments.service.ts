import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CompleteAppointmentDto } from './dto/complete-appointment.dto';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

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

  // Verhindert, dass ein Trainer (oder das Public-Widget über dessen
  // API-Key) einen Termin mit customerId/serviceId eines *anderen*
  // Tenants anlegt - beide IDs müssen zum aktuellen Tenant gehören.
  private async assertBelongsToTenant(tenantId: string, customerId: string, serviceId: string) {
    const [customer, service] = await Promise.all([
      this.prisma.customer.findFirst({ where: { id: customerId, tenantId } }),
      this.prisma.service.findFirst({ where: { id: serviceId, tenantId } }),
    ]);
    if (!customer) {
      throw new NotFoundException('Kunde nicht gefunden');
    }
    if (!service) {
      throw new NotFoundException('Leistung nicht gefunden');
    }
  }

  async create(tenantId: string, dto: CreateAppointmentDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (endTime <= startTime) {
      throw new BadRequestException('endTime muss nach startTime liegen');
    }
    await this.assertBelongsToTenant(tenantId, dto.customerId, dto.serviceId);
    await this.assertNoOverlap(tenantId, startTime, endTime);

    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        startTime,
        endTime,
      },
      include: { customer: true, service: true },
    });

    // Best-effort: falls Google Calendar verbunden ist, Event dort
    // anlegen. Ein Fehler hier darf die Terminbuchung nicht blockieren.
    try {
      const googleEventId = await this.googleCalendarService.createEventForAppointment(
        tenantId,
        {
          id: appointment.id,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          customerName: appointment.customer.name,
          serviceName: appointment.service.name,
        },
      );
      if (googleEventId) {
        await this.prisma.appointment.update({
          where: { id: appointment.id },
          data: { googleEventId },
        });
        appointment.googleEventId = googleEventId;
      }
    } catch (err) {
      this.logger.warn(`Google-Calendar-Sync (create) fehlgeschlagen: ${err}`);
    }

    return appointment;
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

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        startTime,
        endTime,
        status: dto.status ?? existing.status,
      },
    });

    if (existing.googleEventId) {
      try {
        await this.googleCalendarService.updateEventForAppointment(
          tenantId,
          existing.googleEventId,
          {
            startTime: updated.startTime,
            endTime: updated.endTime,
            customerName: existing.customer.name,
            serviceName: existing.service.name,
          },
        );
      } catch (err) {
        this.logger.warn(`Google-Calendar-Sync (update) fehlgeschlagen: ${err}`);
      }
    }

    return updated;
  }

  // Schließt einen Termin ab und übernimmt optional den gewählten
  // Trainingstag als Fortschritt - der Trainer wählt den Tag beim
  // Abschließen aus, da ein Termin selbst keinem festen Tag zugeordnet ist
  // (der Plan hat mehrere Tage, z.B. Push/Pull, die sich abwechseln).
  async complete(tenantId: string, id: string, dto: CompleteAppointmentDto) {
    const appointment = await this.findOne(tenantId, id);

    const loggedExercises = dto.trainingDayId
      ? await this.logTrainingDayProgress(
          appointment.customerId,
          dto.trainingDayId,
          appointment.startTime,
        )
      : 0;

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    return { ...updated, loggedExercises };
  }

  // Legt für jede Übung des gewählten Trainingstags einen Fortschritts-
  // Eintrag an. Wert kommt vom zuletzt für diese Übung geloggten Eintrag
  // (nicht vom Plan-Sollwert) - fehlt ein vorheriger Log, bleibt der Wert
  // leer, der Trainer trägt ihn im Fortschritt-Tab nach.
  private async logTrainingDayProgress(
    customerId: string,
    trainingDayId: string,
    performedAt: Date,
  ): Promise<number> {
    const day = await this.prisma.trainingDay.findFirst({
      where: { id: trainingDayId, plan: { customerId } },
      include: { sections: { include: { exercises: true } } },
    });
    if (!day) {
      throw new NotFoundException('Trainingstag nicht gefunden');
    }

    let count = 0;
    for (const section of day.sections) {
      for (const exercise of section.exercises) {
        const lastLog = await this.prisma.exerciseLog.findFirst({
          where: { customerId, exerciseName: exercise.name },
          orderBy: { performedAt: 'desc' },
        });
        await this.prisma.exerciseLog.create({
          data: {
            customerId,
            category: section.category,
            exerciseName: exercise.name,
            weight: lastLog?.weight ?? undefined,
            sets: lastLog?.sets ?? undefined,
            reps: lastLog?.reps ?? undefined,
            performedAt,
          },
        });
        count += 1;
      }
    }
    return count;
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.googleEventId) {
      try {
        await this.googleCalendarService.deleteEventForAppointment(
          tenantId,
          existing.googleEventId,
        );
      } catch (err) {
        this.logger.warn(`Google-Calendar-Sync (delete) fehlgeschlagen: ${err}`);
      }
    }

    return this.prisma.appointment.delete({ where: { id } });
  }
}
