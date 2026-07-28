import { IsDateString } from 'class-validator';

export class AvailabilityQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
