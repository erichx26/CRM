export type Role = "ADMIN" | "POWER_USER" | "VIEWER";

export function canEdit(role: string | undefined): boolean {
  return role === "ADMIN" || role === "POWER_USER";
}

export function canDelete(role: string | undefined): boolean {
  return role === "ADMIN";
}

export function canManageUsers(role: string | undefined): boolean {
  return role === "ADMIN";
}

export function canExport(role: string | undefined): boolean {
  return role === "ADMIN";
}

export function canViewActivity(role: string | undefined): boolean {
  return role === "ADMIN";
}

export function canBatchImport(role: string | undefined): boolean {
  return role === "ADMIN" || role === "POWER_USER";
}
