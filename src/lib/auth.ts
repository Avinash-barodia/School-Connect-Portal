import { auth } from "@clerk/nextjs/server";
import {
  assertAuthorizedRole,
  AuthorizationError,
  type AuthSession,
  parseAuthSession,
  type Role,
} from "./auth-rules";

export * from "./auth-rules";

/**
 * Extracts and validates the current Clerk session.
 * Returns null if unauthenticated or if the role metadata is missing/unrecognized.
 */
export function getAuthSession(): AuthSession | null {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: unknown } | undefined)?.role;
  return parseAuthSession(userId, role);
}

/**
 * Requires an authenticated session with a valid role.
 */
export function requireAuth(): AuthSession {
  const session = getAuthSession();
  if (!session) {
    throw new AuthorizationError("Unauthorized", 401);
  }
  return session;
}

/**
 * Requires an authenticated session whose role is in `allowedRoles`.
 * Missing or unrecognized roles are denied by default.
 */
export function requireRole(allowedRoles: readonly Role[]): AuthSession {
  return assertAuthorizedRole(getAuthSession(), allowedRoles);
}
