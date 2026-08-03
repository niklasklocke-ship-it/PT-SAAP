import { Module } from '@nestjs/common';
import { TrainingPlanImportService } from './training-plan-import.service';
import { TrainingPlanImportController } from './training-plan-import.controller';

@Module({
  providers: [TrainingPlanImportService],
  controllers: [TrainingPlanImportController],
})
export class TrainingPlanImportModule {}
