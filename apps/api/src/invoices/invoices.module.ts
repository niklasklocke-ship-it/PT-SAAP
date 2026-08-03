import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  imports: [MailModule],
  providers: [InvoicesService, InvoicePdfService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
