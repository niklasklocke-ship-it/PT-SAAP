import { IsString } from 'class-validator';

export class CreateTrainingSectionDto {
  @IsString()
  dayId: string;

  @IsString()
  category: string;
}
