import { IsString } from 'class-validator';

export class UpdateTrainingDayDto {
  @IsString()
  name: string;
}
