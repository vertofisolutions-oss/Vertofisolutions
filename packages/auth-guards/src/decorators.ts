import {
  applyDecorators,
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from "@nestjs/common";
import type { Permission, Role } from "@vertofi/tenancy";

export const ROLES_KEY = "vertofi:roles";
export const PUBLIC_KEY = "vertofi:public";
export const PERMISSION_KEY = "vertofi:permission";
export const SENSITIVE_KEY = "vertofi:sensitive";

/** Allow only the listed roles to hit this route. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Mark a route as not requiring authentication (login, webhooks with own auth). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/** Require a minimum permission (VIEW/EDIT) on the target resource. */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);

/**
 * Mark a route as a sensitive financial/document action that requires a
 * valid step-up OTP (see docs/06-authentication-and-otp.md). The guard returns
 * 428 Precondition Required with a challenge if the OTP header is missing.
 */
export const Sensitive = (kind: "FINANCIAL" | "DOCUMENT" = "FINANCIAL") =>
  applyDecorators(SetMetadata(SENSITIVE_KEY, kind));

/** Inject the authenticated Principal into a controller method param. */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.principal;
  },
);
