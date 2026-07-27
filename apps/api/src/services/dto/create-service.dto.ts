import { IsEnum, IsInt, IsNumber, IsString, Min } from 'class-validator';
import { ServiceType } from '@prisma/client';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(5)
  durationMin: number;

  @IsEnum(ServiceType)
  type: ServiceType;
}
