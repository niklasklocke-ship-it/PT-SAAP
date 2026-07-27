import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Ein Trainer registriert sich = ein neuer Tenant wird angelegt.
  async register(dto: RegisterDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('E-Mail wird bereits verwendet');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
      },
    });

    return this.buildAuthResponse(tenant);
  }

  async login(dto: LoginDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { email: dto.email },
    });
    if (!tenant) {
      throw new UnauthorizedException('E-Mail oder Passwort ist falsch');
    }

    const passwordValid = await bcrypt.compare(dto.password, tenant.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('E-Mail oder Passwort ist falsch');
    }

    return this.buildAuthResponse(tenant);
  }

  private buildAuthResponse(tenant: { id: string; name: string; email: string; publicApiKey: string }) {
    const accessToken = this.jwtService.sign({ sub: tenant.id, email: tenant.email });
    return {
      accessToken,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        publicApiKey: tenant.publicApiKey,
      },
    };
  }
}
