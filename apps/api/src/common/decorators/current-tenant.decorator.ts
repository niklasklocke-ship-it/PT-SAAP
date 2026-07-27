import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Liest den eingeloggten Trainer (Tenant) aus dem Request,
// nachdem der JwtAuthGuard oder ApiKeyGuard ihn dort abgelegt hat.
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
