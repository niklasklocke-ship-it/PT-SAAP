import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { ExerciseLogsService } from './exercise-logs.service';
import { CreateExerciseLogDto } from './dto/create-exercise-log.dto';

@UseGuards(JwtAuthGuard)
@Controller('exercise-logs')
export class ExerciseLogsController {
  constructor(private readonly exerciseLogsService: ExerciseLogsService) {}

  @Post()
  create(@CurrentTenant() tenant: { tenantId: string }, @Body() dto: CreateExerciseLogDto) {
    return this.exerciseLogsService.create(tenant.tenantId, dto);
  }

  @Get('customer/:customerId')
  findAllForCustomer(
    @CurrentTenant() tenant: { tenantId: string },
    @Param('customerId') customerId: string,
  ) {
    return this.exerciseLogsService.findAllForCustomer(tenant.tenantId, customerId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.exerciseLogsService.remove(tenant.tenantId, id);
  }
}
