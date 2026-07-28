import { Module } from '@nestjs/common';
import { TrainingPlansService } from './training-plans.service';
import { TrainingPlansController } from './training-plans.controller';

@Module({
  providers: [TrainingPlansService],
  controllers: [TrainingPlansController],
  exports: [TrainingPlansService],
})
export class TrainingPlansModule {}
