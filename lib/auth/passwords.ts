/**
 * Temporary password generation — pure, dependency-light (node:crypto only)
 * so it can be unit-tested deterministically by Scripts/check-passwords.mjs
 * and shared by every server action that creates/resets a company account.
 *
 * Security contract:
 *  - Cryptographically random (node:crypto randomInt).
 *  - Never stored anywhere except Supabase Auth (hashed by GoTrue). The
 *    plaintext is returned to the authorized creator ONCE for display and
 *    is never written to profiles or any other table.
 *  - Accounts created with a temporary password are immediately usable
 *    (no dependency on invitation email delivery) and carry the durable
 *    "must change password" gate (user_metadata.__pending_invite) so the
 *    first login is forced through /set-password.
 */

import { randomInt } from "node:crypto";

// Ambiguity-free alphabets (no 0/O, 1/l/I).
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_=+?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pick(charset: string): string {
  return charset[randomInt(charset.length)];
}

/**
 * Generate a cryptographically random temporary password.
 *
 * Guarantees at least one character from each class (upper, lower, digit,
 * symbol) and a full Fisher–Yates shuffle so no class is positionally
 * predictable. Default length 14.
 */
export function generateTemporaryPassword(length = 14): string {
  const size = Math.max(4, length);
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < size) chars.push(pick(ALL));

  // Fisher–Yates shuffle (crypto-random indices).
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

/**
 * Shape assertion for deterministic tests: length >= 12 and at least one
 * upper, lower, digit, and symbol. The production generator always satisfies
 * this; the test guards regressions (e.g. a charset losing a class).
 */
export function passwordShapeOk(pw: string): boolean {
  return (
    pw.length >= 12 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}
