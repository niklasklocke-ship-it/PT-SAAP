import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ImportTrainingExerciseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sets?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  reps?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ImportTrainingSectionDto {
  @IsString()
  category: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTrainingExerciseDto)
  exercises: ImportTrainingExerciseDto[];
}

export class ImportTrainingDayDto {
  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTrainingSectionDto)
  sections: ImportTrainingSectionDto[];
}

export class ImportTrainingPlanDto {
  @IsIn(['REPLACE', 'APPEND'])
  mode: 'REPLACE' | 'APPEND';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportTrainingDayDto)
  days: ImportTrainingDayDto[];
}
