import { IsDateString, IsOptional } from 'class-validator';

export class FindAppointmentsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
