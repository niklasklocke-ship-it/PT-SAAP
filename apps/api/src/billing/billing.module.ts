import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me-in-production',
    }),
  ],
  providers: [BillingService],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
