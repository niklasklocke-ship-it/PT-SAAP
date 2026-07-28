import { IsString } from 'class-validator';

export class UpdateTrainingSectionDto {
  @IsString()
  category: string;
}
