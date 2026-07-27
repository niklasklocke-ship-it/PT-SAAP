import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';

@Module({
  imports: [AppointmentsModule],
  providers: [PublicService],
  controllers: [PublicController],
})
export class PublicModule {}
