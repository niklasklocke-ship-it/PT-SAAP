import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global: einmal importiert, in jedem Modul ohne erneuten Import nutzbar.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
