/**
 * SaaS Staff Permission Layer — Constants & Types
 *
 * Client-safe module. Contains permission keys, permission groups,
 * default permission sets, and the PermissionError class.
 * No server-only imports.
 *
 * Server-only functions (getUserPermissions, hasPermission,
 * assertPermission, requirePermission) live in `permissions.server.ts`.
 */

/** All module permission keys supported by the system. */
export const MODULE_PERMISSIONS = [
  "orders",
  "purchase",
  "packing",
  "dispatch",
  "delivery",
  "payments",
  "reports",
  "products",
  "marketplaces",
  "seller_accounts",
] as const;

export type Permission = (typeof MODULE_PERMISSIONS)[number];

/** Permissions that are master-data mutations — restricted by role. */
export const MASTER_DATA_PERMISSIONS: Permission[] = [
  "products",
  "marketplaces",
  "seller_accounts",
];

/** Permissions for operational modules. */
export const OPERATIONAL_PERMISSIONS: Permission[] = [
  "orders",
  "purchase",
  "packing",
  "dispatch",
  "delivery",
  "payments",
];

/** Permissions for analytics modules. */
export const ANALYTICS_PERMISSIONS: Permission[] = ["reports"];

/** Safe default permission set for newly invited staff. */
export const DEFAULT_STAFF_PERMISSIONS: Record<string, boolean> = {
  orders: true,
  purchase: true,
  packing: true,
  dispatch: true,
  delivery: true,
  payments: true,
  reports: false,
  products: false,
  marketplaces: false,
  seller_accounts: false,
};

export class PermissionError extends Error {
  readonly code = "PERMISSION_DENIED" as const;
  readonly permission: string;

  constructor(permission: string) {
    super(`Permission denied: ${permission}`);
    this.name = "PermissionError";
    this.permission = permission;
  }
}
