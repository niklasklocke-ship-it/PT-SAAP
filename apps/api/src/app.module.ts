import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { ServicesModule } from './services/services.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { CustomerPackagesModule } from './customer-packages/customer-packages.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { PublicModule } from './public/public.module';
import { ExerciseLogsModule } from './exercise-logs/exercise-logs.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CustomersModule,
    ServicesModule,
    AppointmentsModule,
    CustomerPackagesModule,
    InvoicesModule,
    PaymentsModule,
    PublicModule,
    ExerciseLogsModule,
  ],
})
export class AppModule {}
