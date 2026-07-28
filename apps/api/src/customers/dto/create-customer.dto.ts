import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  trainingGoalsSummary?: string;

  @IsOptional()
  @IsString()
  trainingGoalsDetail?: string;

  @IsOptional()
  @IsString()
  trainingPlan?: string;
}
