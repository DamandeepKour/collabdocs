import {
  ROLE_PERMISSIONS,
  type DocumentRole,
} from "@/constants";
import { ApiError } from "@/server/security/http";

export type Capability = keyof (typeof ROLE_PERMISSIONS)["OWNER"];

export function can(role: DocumentRole, capability: Capability): boolean {
  return ROLE_PERMISSIONS[role][capability];
}

export function assertCan(role: DocumentRole, capability: Capability): void {
  if (!can(role, capability)) {
    throw new ApiError(
      403,
      `Role ${role} cannot perform '${capability}'`,
      "FORBIDDEN",
    );
  }
}

/** Highest role wins when a user is both owner and has a permission row. */
export function resolveEffectiveRole(
  isOwner: boolean,
  permissionRole: DocumentRole | null | undefined,
): DocumentRole | null {
  if (isOwner) return "OWNER";
  return permissionRole ?? null;
}
