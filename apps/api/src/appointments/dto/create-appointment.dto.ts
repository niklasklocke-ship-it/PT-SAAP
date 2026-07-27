import { IsDateString, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  customerId: string;

  @IsString()
  serviceId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}
