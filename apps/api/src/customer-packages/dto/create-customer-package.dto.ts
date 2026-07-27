import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCustomerPackageDto {
  @IsString()
  customerId: string;

  @IsString()
  serviceId: string;

  @IsInt()
  @Min(1)
  remainingSessions: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
