import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { TrainingPlanImportService } from './training-plan-import.service';

@UseGuards(JwtAuthGuard)
@Controller('training-plan-import')
export class TrainingPlanImportController {
  constructor(private readonly service: TrainingPlanImportService) {}

  @Post('customer/:customerId/parse')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          callback(new BadRequestException('Nur PDF-Dateien werden unterstützt'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  parse(
    @CurrentTenant() tenant: { tenantId: string },
    @Param('customerId') customerId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Keine Datei hochgeladen');
    }
    return this.service.parse(tenant.tenantId, customerId, file);
  }
}
