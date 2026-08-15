/**
 * Safe user-facing error mapping for Supabase / PostgREST errors.
 *
 * Server Actions must never surface raw `error.message` — it can
 * leak SQL fragments, table/constraint names, RLS internals, or
 * GoTrue/auth details. This helper maps known Postgres error codes
 * to generic messages and falls back to a safe generic string for
 * everything else (including auth/GoTrue errors).
 *
 * Validation messages and EntitlementError/PermissionError messages
 * are handled by their own branches in the actions and are NOT
 * routed through here.
 */

export function mapDbError(
  error: { code?: string | null; message?: string | null } | null | undefined,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;

  switch (error.code) {
    case "23505": // unique_violation
      return "This record already exists. Please use a different value.";
    case "23503": // foreign_key_violation
      return "A related record is missing or was already deleted.";
    case "23502": // not_null_violation
      return "A required field is missing.";
    case "23514": // check_violation
      return "The value you entered is not valid.";
    case "22P02": // invalid_text_representation
    case "22003": // numeric_value_out_of_range
      return "One of the values you entered is not valid.";
    case "42501": // insufficient_privilege
      return "You are not allowed to perform this action.";
    default:
      // Unknown Postgres codes, GoTrue/auth errors, network errors —
      // never leak internals.
      return fallback;
  }
}
