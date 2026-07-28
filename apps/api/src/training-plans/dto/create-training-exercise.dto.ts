import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTrainingExerciseDto {
  @IsString()
  sectionId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sets?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reps?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
