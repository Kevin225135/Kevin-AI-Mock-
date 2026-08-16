import type { CurrentUser, UserRole } from "@/lib/domain/types";

export const permissionsByRole: Record<UserRole, string[]> = {
  USER: [
    "mock:create",
    "mock:read:self",
    "mock:answer:self",
    "report:read:self",
    "user:read:self",
    "user:update:self",
    "usage:read:self"
  ],
  ADMIN: ["*"]
};

export function getPermissions(role: UserRole) {
  return permissionsByRole[role];
}

export function hasPermission(user: CurrentUser, permission: string) {
  const permissions = getPermissions(user.role);
  return permissions.includes("*") || permissions.includes(permission);
}

export function canAccessOwnedResource(user: CurrentUser, ownerUserId: string) {
  return user.role === "ADMIN" || user.id === ownerUserId;
}
