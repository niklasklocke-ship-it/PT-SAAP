import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainingDayDto } from './dto/create-training-day.dto';
import { UpdateTrainingDayDto } from './dto/update-training-day.dto';
import { CreateTrainingSectionDto } from './dto/create-training-section.dto';
import { UpdateTrainingSectionDto } from './dto/update-training-section.dto';
import { CreateTrainingExerciseDto } from './dto/create-training-exercise.dto';
import { UpdateTrainingExerciseDto } from './dto/update-training-exercise.dto';

const PLAN_INCLUDE = {
  days: {
    orderBy: { order: 'asc' as const },
    include: {
      sections: {
        orderBy: { order: 'asc' as const },
        include: {
          exercises: { orderBy: { order: 'asc' as const } },
        },
      },
    },
  },
};

@Injectable()
export class TrainingPlansService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Tenant-Scoping-Helfer: prüfen die gesamte Kette bis zum Tenant ---

  private async assertCustomerBelongsToTenant(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Kunde nicht gefunden');
    }
  }

  private async assertPlanBelongsToTenant(tenantId: string, planId: string) {
    const plan = await this.prisma.trainingPlan.findFirst({
      where: { id: planId, customer: { tenantId } },
    });
    if (!plan) {
      throw new NotFoundException('Trainingsplan nicht gefunden');
    }
    return plan;
  }

  private async assertDayBelongsToTenant(tenantId: string, dayId: string) {
    const day = await this.prisma.trainingDay.findFirst({
      where: { id: dayId, plan: { customer: { tenantId } } },
    });
    if (!day) {
      throw new NotFoundException('Trainingstag nicht gefunden');
    }
    return day;
  }

  private async assertSectionBelongsToTenant(tenantId: string, sectionId: string) {
    const section = await this.prisma.trainingSection.findFirst({
      where: { id: sectionId, day: { plan: { customer: { tenantId } } } },
    });
    if (!section) {
      throw new NotFoundException('Abschnitt nicht gefunden');
    }
    return section;
  }

  private async assertExerciseBelongsToTenant(tenantId: string, exerciseId: string) {
    const exercise = await this.prisma.trainingExercise.findFirst({
      where: { id: exerciseId, section: { day: { plan: { customer: { tenantId } } } } },
    });
    if (!exercise) {
      throw new NotFoundException('Übung nicht gefunden');
    }
    return exercise;
  }

  // Prüft, dass reorder-ids exakt die vorhandenen Kind-ids sind - verhindert,
  // dass über eine Reorder-Anfrage fremde ids "eingeschleust" werden.
  private assertSameIdSet(existingIds: string[], providedIds: string[]) {
    const existing = new Set(existingIds);
    const provided = new Set(providedIds);
    if (existing.size !== provided.size || [...existing].some((id) => !provided.has(id))) {
      throw new BadRequestException('Reorder-Liste passt nicht zu den vorhandenen Einträgen');
    }
  }

  // --- Plan ---

  async getOrCreatePlan(tenantId: string, customerId: string) {
    await this.assertCustomerBelongsToTenant(tenantId, customerId);
    const existing = await this.prisma.trainingPlan.findUnique({
      where: { customerId },
      include: PLAN_INCLUDE,
    });
    if (existing) {
      return existing;
    }
    const created = await this.prisma.trainingPlan.create({ data: { customerId } });
    return this.prisma.trainingPlan.findUnique({
      where: { id: created.id },
      include: PLAN_INCLUDE,
    });
  }

  // --- Trainingstage ---

  async addDay(tenantId: string, dto: CreateTrainingDayDto) {
    await this.assertPlanBelongsToTenant(tenantId, dto.planId);
    const count = await this.prisma.trainingDay.count({ where: { planId: dto.planId } });
    return this.prisma.trainingDay.create({
      data: { planId: dto.planId, name: dto.name, order: count },
    });
  }

  async renameDay(tenantId: string, dayId: string, dto: UpdateTrainingDayDto) {
    await this.assertDayBelongsToTenant(tenantId, dayId);
    return this.prisma.trainingDay.update({ where: { id: dayId }, data: { name: dto.name } });
  }

  async removeDay(tenantId: string, dayId: string) {
    await this.assertDayBelongsToTenant(tenantId, dayId);
    await this.prisma.trainingDay.delete({ where: { id: dayId } });
  }

  async reorderDays(tenantId: string, planId: string, ids: string[]) {
    await this.assertPlanBelongsToTenant(tenantId, planId);
    const days = await this.prisma.trainingDay.findMany({ where: { planId } });
    this.assertSameIdSet(
      days.map((d) => d.id),
      ids,
    );
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.trainingDay.update({ where: { id }, data: { order: index } }),
      ),
    );
  }

  // --- Abschnitte ---

  async addSection(tenantId: string, dto: CreateTrainingSectionDto) {
    await this.assertDayBelongsToTenant(tenantId, dto.dayId);
    const count = await this.prisma.trainingSection.count({ where: { dayId: dto.dayId } });
    return this.prisma.trainingSection.create({
      data: { dayId: dto.dayId, category: dto.category, order: count },
    });
  }

  async updateSection(tenantId: string, sectionId: string, dto: UpdateTrainingSectionDto) {
    await this.assertSectionBelongsToTenant(tenantId, sectionId);
    return this.prisma.trainingSection.update({
      where: { id: sectionId },
      data: { category: dto.category },
    });
  }

  async removeSection(tenantId: string, sectionId: string) {
    await this.assertSectionBelongsToTenant(tenantId, sectionId);
    await this.prisma.trainingSection.delete({ where: { id: sectionId } });
  }

  async reorderSections(tenantId: string, dayId: string, ids: string[]) {
    await this.assertDayBelongsToTenant(tenantId, dayId);
    const sections = await this.prisma.trainingSection.findMany({ where: { dayId } });
    this.assertSameIdSet(
      sections.map((s) => s.id),
      ids,
    );
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.trainingSection.update({ where: { id }, data: { order: index } }),
      ),
    );
  }

  // --- Übungen ---

  async addExercise(tenantId: string, dto: CreateTrainingExerciseDto) {
    await this.assertSectionBelongsToTenant(tenantId, dto.sectionId);
    const count = await this.prisma.trainingExercise.count({
      where: { sectionId: dto.sectionId },
    });
    return this.prisma.trainingExercise.create({
      data: {
        sectionId: dto.sectionId,
        name: dto.name,
        sets: dto.sets,
        reps: dto.reps,
        weight: dto.weight,
        restSeconds: dto.restSeconds,
        notes: dto.notes,
        order: count,
      },
    });
  }

  async updateExercise(tenantId: string, exerciseId: string, dto: UpdateTrainingExerciseDto) {
    await this.assertExerciseBelongsToTenant(tenantId, exerciseId);
    return this.prisma.trainingExercise.update({
      where: { id: exerciseId },
      data: {
        name: dto.name,
        sets: dto.sets,
        reps: dto.reps,
        weight: dto.weight,
        restSeconds: dto.restSeconds,
        notes: dto.notes,
      },
    });
  }

  async removeExercise(tenantId: string, exerciseId: string) {
    await this.assertExerciseBelongsToTenant(tenantId, exerciseId);
    await this.prisma.trainingExercise.delete({ where: { id: exerciseId } });
  }

  async reorderExercises(tenantId: string, sectionId: string, ids: string[]) {
    await this.assertSectionBelongsToTenant(tenantId, sectionId);
    const exercises = await this.prisma.trainingExercise.findMany({ where: { sectionId } });
    this.assertSameIdSet(
      exercises.map((e) => e.id),
      ids,
    );
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.trainingExercise.update({ where: { id }, data: { order: index } }),
      ),
    );
  }
}
