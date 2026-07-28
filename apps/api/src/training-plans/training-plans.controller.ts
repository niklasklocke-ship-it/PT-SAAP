import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { TrainingPlansService } from './training-plans.service';
import { CreateTrainingDayDto } from './dto/create-training-day.dto';
import { UpdateTrainingDayDto } from './dto/update-training-day.dto';
import { CreateTrainingSectionDto } from './dto/create-training-section.dto';
import { UpdateTrainingSectionDto } from './dto/update-training-section.dto';
import { CreateTrainingExerciseDto } from './dto/create-training-exercise.dto';
import { UpdateTrainingExerciseDto } from './dto/update-training-exercise.dto';
import { ReorderDto } from './dto/reorder.dto';

type TenantParam = { tenantId: string };

@UseGuards(JwtAuthGuard)
@Controller('training-plans')
export class TrainingPlansController {
  constructor(private readonly service: TrainingPlansService) {}

  @Get('customer/:customerId')
  getOrCreatePlan(
    @CurrentTenant() tenant: TenantParam,
    @Param('customerId') customerId: string,
  ) {
    return this.service.getOrCreatePlan(tenant.tenantId, customerId);
  }

  @Post('days')
  addDay(@CurrentTenant() tenant: TenantParam, @Body() dto: CreateTrainingDayDto) {
    return this.service.addDay(tenant.tenantId, dto);
  }

  @Patch('days/:id')
  renameDay(
    @CurrentTenant() tenant: TenantParam,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingDayDto,
  ) {
    return this.service.renameDay(tenant.tenantId, id, dto);
  }

  @Delete('days/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDay(@CurrentTenant() tenant: TenantParam, @Param('id') id: string) {
    return this.service.removeDay(tenant.tenantId, id);
  }

  @Post('days/:planId/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  reorderDays(
    @CurrentTenant() tenant: TenantParam,
    @Param('planId') planId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.service.reorderDays(tenant.tenantId, planId, dto.ids);
  }

  @Post('sections')
  addSection(@CurrentTenant() tenant: TenantParam, @Body() dto: CreateTrainingSectionDto) {
    return this.service.addSection(tenant.tenantId, dto);
  }

  @Patch('sections/:id')
  updateSection(
    @CurrentTenant() tenant: TenantParam,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingSectionDto,
  ) {
    return this.service.updateSection(tenant.tenantId, id, dto);
  }

  @Delete('sections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSection(@CurrentTenant() tenant: TenantParam, @Param('id') id: string) {
    return this.service.removeSection(tenant.tenantId, id);
  }

  @Post('sections/:dayId/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  reorderSections(
    @CurrentTenant() tenant: TenantParam,
    @Param('dayId') dayId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.service.reorderSections(tenant.tenantId, dayId, dto.ids);
  }

  @Post('exercises')
  addExercise(@CurrentTenant() tenant: TenantParam, @Body() dto: CreateTrainingExerciseDto) {
    return this.service.addExercise(tenant.tenantId, dto);
  }

  @Patch('exercises/:id')
  updateExercise(
    @CurrentTenant() tenant: TenantParam,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingExerciseDto,
  ) {
    return this.service.updateExercise(tenant.tenantId, id, dto);
  }

  @Delete('exercises/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeExercise(@CurrentTenant() tenant: TenantParam, @Param('id') id: string) {
    return this.service.removeExercise(tenant.tenantId, id);
  }

  @Post('exercises/:sectionId/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  reorderExercises(
    @CurrentTenant() tenant: TenantParam,
    @Param('sectionId') sectionId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.service.reorderExercises(tenant.tenantId, sectionId, dto.ids);
  }
}
