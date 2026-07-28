import { Module } from '@nestjs/common';
import { ExerciseLogsService } from './exercise-logs.service';
import { ExerciseLogsController } from './exercise-logs.controller';

@Module({
  providers: [ExerciseLogsService],
  controllers: [ExerciseLogsController],
  exports: [ExerciseLogsService],
})
export class ExerciseLogsModule {}
