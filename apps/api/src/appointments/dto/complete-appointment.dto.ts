import { IsOptional, IsString } from 'class-validator';

export class CompleteAppointmentDto {
  // Optional: wenn gesetzt, wird jede Übung dieses Trainingstags als
  // Fortschritts-Eintrag übernommen (siehe AppointmentsService.complete).
  @IsOptional()
  @IsString()
  trainingDayId?: string;
}
