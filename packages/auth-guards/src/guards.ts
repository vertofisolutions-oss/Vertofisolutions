import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  type Type,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@vertofi/tenancy";
import { JwtService, claimsToPrincipal } from "./jwt.js";
import { PUBLIC_KEY, ROLES_KEY } from "./decorators.js";

/**
 * Verifies the access JWT and attaches `req.principal`. Skips routes marked
 * @Public. This is the first authorization layer (see docs/04 enforcement
 * checklist). RBAC (RolesGuard), ABAC (access service), and RLS follow.
 */
export function createJwtAuthGuard(jwt: JwtService): Type<CanActivate> {
  @Injectable()
  class JwtAuthGuard implements CanActivate {
    constructor(readonly reflector: Reflector) {}

    canActivate(ctx: ExecutionContext): boolean {
      const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      if (isPublic) return true;

      const req = ctx.switchToHttp().getRequest();
      const header: string | undefined = req.headers?.authorization;
      if (!header?.startsWith("Bearer ")) {
        throw new UnauthorizedException("Missing bearer token");
      }
      try {
        const claims = jwt.verifyAccess(header.slice(7));
        req.principal = claimsToPrincipal(claims);
        return true;
      } catch {
        throw new UnauthorizedException("Invalid or expired token");
      }
    }
  }
  return JwtAuthGuard;
}

/** Enforces @Roles metadata against the authenticated principal. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const principal = req.principal;
    if (!principal) throw new UnauthorizedException();
    if (!required.includes(principal.role)) {
      throw new ForbiddenException("Insufficient role for this resource");
    }
    return true;
  }
}
