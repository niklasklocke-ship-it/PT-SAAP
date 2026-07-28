import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({ data: { ...dto, tenantId } });
  }

  findAll(tenantId: string) {
    return this.prisma.service.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, tenantId },
    });
    if (!service) {
      throw new NotFoundException('Leistung nicht gefunden');
    }
    return service;
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(tenantId, id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    try {
      return await this.prisma.service.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException(
          'Leistung kann nicht gelöscht werden, solange noch Termine oder Pakete darauf verweisen',
        );
      }
      throw err;
    }
  }
}
