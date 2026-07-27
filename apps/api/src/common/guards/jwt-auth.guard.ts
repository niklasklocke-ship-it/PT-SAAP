import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Schützt alle Trainer-Dashboard-Endpunkte (Kunden, Termine, Rechnungen verwalten).
// Nach erfolgreicher Prüfung liegt request.tenant = { tenantId, email } vor.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest();
    request.tenant = request.user;
    return canActivate;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Nicht angemeldet');
    }
    return user;
  }
}
