import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseLogDto } from './dto/create-exercise-log.dto';

@Injectable()
export class ExerciseLogsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCustomerBelongsToTenant(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Kunde nicht gefunden');
    }
  }

  async create(tenantId: string, dto: CreateExerciseLogDto) {
    await this.assertCustomerBelongsToTenant(tenantId, dto.customerId);
    return this.prisma.exerciseLog.create({
      data: {
        customerId: dto.customerId,
        category: dto.category,
        exerciseName: dto.exerciseName,
        weight: dto.weight,
        sets: dto.sets,
        reps: dto.reps,
        performedAt: new Date(dto.performedAt),
        notes: dto.notes,
      },
    });
  }

  // Sortiert nach Übung + Datum, damit das Frontend direkt pro Übung
  // gruppieren und chronologisch anzeigen kann.
  async findAllForCustomer(tenantId: string, customerId: string) {
    await this.assertCustomerBelongsToTenant(tenantId, customerId);
    return this.prisma.exerciseLog.findMany({
      where: { customerId },
      orderBy: [{ exerciseName: 'asc' }, { performedAt: 'asc' }],
    });
  }

  async remove(tenantId: string, id: string) {
    const log = await this.prisma.exerciseLog.findFirst({
      where: { id, customer: { tenantId } },
    });
    if (!log) {
      throw new NotFoundException('Eintrag nicht gefunden');
    }
    await this.prisma.exerciseLog.delete({ where: { id } });
  }
}
