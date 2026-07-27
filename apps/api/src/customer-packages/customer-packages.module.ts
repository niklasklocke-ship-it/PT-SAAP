import { Module } from '@nestjs/common';
import { CustomerPackagesService } from './customer-packages.service';
import { CustomerPackagesController } from './customer-packages.controller';

@Module({
  providers: [CustomerPackagesService],
  controllers: [CustomerPackagesController],
  exports: [CustomerPackagesService],
})
export class CustomerPackagesModule {}
