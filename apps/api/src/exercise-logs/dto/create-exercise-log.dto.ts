import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateExerciseLogDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  exerciseName: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sets?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reps?: number;

  @IsDateString()
  performedAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
