import {
  BadRequestException,
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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

  // Gibt bewusst immer die gleiche Antwort zurück, unabhängig davon, ob die
  // E-Mail existiert - verhindert, dass sich das Endpoint zum Enumerieren
  // registrierter E-Mail-Adressen missbrauchen lässt.
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { email: dto.email } });
    if (tenant) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
      await this.mailService.sendPasswordResetEmail(tenant.email, resetUrl);
    }
    return {
      message: 'Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail mit einem Link zum Zurücksetzen versendet.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const tenant = await this.prisma.tenant.findFirst({
      where: { passwordResetTokenHash: tokenHash },
    });
    if (!tenant || !tenant.passwordResetExpiresAt || tenant.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Der Link ist ungültig oder abgelaufen');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
    return { message: 'Passwort wurde erfolgreich zurückgesetzt' };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Trainer nicht gefunden');
    }
    return this.toProfile(tenant);
  }

  async updateProfile(tenantId: string, dto: UpdateProfileDto) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        taxId: dto.taxId,
        paymentMethodLabel: dto.paymentMethodLabel,
      },
    });
    return this.toProfile(tenant);
  }

  private toProfile(tenant: {
    id: string;
    name: string;
    email: string;
    taxId: string | null;
    subscriptionPlan: string;
    paymentMethodLabel: string | null;
    publicApiKey: string;
  }) {
    return {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      taxId: tenant.taxId,
      subscriptionPlan: tenant.subscriptionPlan,
      paymentMethodLabel: tenant.paymentMethodLabel,
      publicApiKey: tenant.publicApiKey,
    };
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
