import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

// Wird vom Website-Widget bzw. der Kunden-App beim Buchen eines
// Termins gesendet. Der Endkunde muss sich nicht einloggen.
export class CreatePublicBookingDto {
  @IsString()
  customerName: string;

  @IsEmail()
  customerEmail: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsString()
  serviceId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}
