import { IsString } from 'class-validator';

export class CreateTrainingDayDto {
  @IsString()
  planId: string;

  @IsString()
  name: string;
}
