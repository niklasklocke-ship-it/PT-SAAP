import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Schützt die öffentlichen Buchungs-Endpunkte, die vom Website-Widget
// und der Kunden-App genutzt werden. Kein Login nötig - stattdessen
// ein öffentlicher API-Key pro Trainer im Header "x-api-key".
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('x-api-key Header fehlt');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { publicApiKey: apiKey },
    });

    if (!tenant) {
      throw new UnauthorizedException('Ungültiger API-Key');
    }

    request.tenant = { tenantId: tenant.id, email: tenant.email };
    return true;
  }
}
