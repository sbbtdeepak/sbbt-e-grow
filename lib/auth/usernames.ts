/**
 * Application User ID generation — pure functions only (no imports, no I/O)
 * so they can be unit-tested deterministically by Scripts/check-usernames.mjs.
 *
 * Conventions:
 *   company admin -> {company-slug}.admin
 *   staff         -> {company-slug}.staff1, .staff2, .staff3, …
 *
 * - Usernames are GLOBALLY unique: company slugs are unique, so
 *   `{slug}.admin` / `{slug}.staffN` cannot collide across companies.
 * - Usernames are NEVER reused: staff rows persist when deactivated, so the
 *   next number is max(existing N) + 1 (never a gap fill).
 * - Generation is always server-side — never accepted from the browser.
 * - Master Admin is not company-scoped and has no username (email login).
 */

export type UsernameRole = "company_admin" | "staff";

/** Normalize a company slug for use in a username (defensive lowercasing). */
export function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate the username for a company admin. Always `${slug}.admin`;
 * falls back deterministically to `${slug}.admin-2`, `-3`, … if that
 * exact id is ever already taken (defensive; normally impossible since
 * the app allows one admin per company and slugs are unique).
 */
export function generateAdminUsername(
  slug: string,
  existing: Iterable<string>,
): string {
  const base = `${normalizeSlug(slug)}.admin`;
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Generate the next staff username for a company: `{slug}.staffN` where N
 * is one greater than the largest existing N for that company. Historical
 * usernames stay reserved (deactivated staff rows persist), so numbers are
 * never reused.
 */
export function generateStaffUsername(
  slug: string,
  existing: Iterable<string>,
): string {
  const normalized = normalizeSlug(slug);
  const prefix = `${normalized}.staff`;
  let max = 0;
  for (const name of existing) {
    if (!name.startsWith(prefix)) continue;
    const rest = name.slice(prefix.length);
    if (/^[1-9]\d*$/.test(rest)) {
      const n = Number(rest);
      if (n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}

/**
 * Generate a username for a company user. `existing` must contain every
 * username currently assigned in the whole platform (usernames are global);
 * the caller fetches that set server-side.
 */
export function generateUsername(
  slug: string,
  role: UsernameRole,
  existing: Iterable<string>,
): string {
  return role === "company_admin"
    ? generateAdminUsername(slug, existing)
    : generateStaffUsername(slug, existing);
}

/**
 * Login-resolver routing: generated User IDs never contain "@", so an
 * identifier with "@" is the Auth email (master / legacy accounts) and
 * anything else is a User ID to resolve through profiles.username.
 */
export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes("@");
}
