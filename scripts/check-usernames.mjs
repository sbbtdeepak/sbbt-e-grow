#!/usr/bin/env node
/**
 * Deterministic assertions for the application User ID system (Phase 24.6).
 *
 * Imports the shared pure module lib/auth/usernames.ts (Node 24 native
 * type stripping — dependency-free, erasable syntax) and asserts:
 *
 *   - company-admin convention   {slug}.admin
 *   - staff numbering            {slug}.staff1, .staff2, …
 *   - cross-company uniqueness   ankit.* vs angad.* vs anmol.*
 *   - normalization              spaces/uppercase/unsafe chars → slug form
 *   - collision handling         never reuses an existing User ID
 *   - master exclusion           master is email-based, no username
 *   - login routing              email vs User ID identifiers
 *
 * Run: node Scripts/check-usernames.mjs
 */
import {
  generateAdminUsername,
  generateStaffUsername,
  generateUsername,
  isEmailIdentifier,
  normalizeSlug,
} from "../lib/auth/usernames.ts";

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

console.log("User ID generation check");
console.log("");

// ── company admin convention ────────────────────────────────────────────
check(
  "ankit company admin -> ankit.admin",
  generateAdminUsername("ankit", []) === "ankit.admin",
);
check(
  "angad company admin -> angad.admin",
  generateAdminUsername("angad", []) === "angad.admin",
);
check(
  "anmol company admin -> anmol.admin",
  generateAdminUsername("anmol", []) === "anmol.admin",
);

// ── staff numbering ─────────────────────────────────────────────────────
check(
  "first ankit staff -> ankit.staff1",
  generateStaffUsername("ankit", []) === "ankit.staff1",
);
check(
  "second ankit staff -> ankit.staff2",
  generateStaffUsername("ankit", ["ankit.staff1"]) === "ankit.staff2",
);
check(
  "third ankit staff -> ankit.staff3",
  generateStaffUsername("ankit", ["ankit.staff1", "ankit.staff2"]) ===
    "ankit.staff3",
);
check(
  "fourth (staff1-3 reserved) -> ankit.staff4",
  generateStaffUsername("ankit", [
    "ankit.staff1",
    "ankit.staff2",
    "ankit.staff3",
  ]) === "ankit.staff4",
);
check(
  "deactivated staff username stays reserved (no reuse)",
  generateStaffUsername("ankit", [
    "ankit.staff1",
    "ankit.staff2",
    "ankit.staff3",
  ]) === "ankit.staff4",
);

// ── cross-company uniqueness ────────────────────────────────────────────
const ankitSet = ["ankit.staff1", "ankit.staff2", "ankit.staff3"];
check(
  "angad staff1 independent of ankit numbering",
  generateStaffUsername("angad", ankitSet) === "angad.staff1",
);
check(
  "anmol staff1 independent of ankit numbering",
  generateStaffUsername("anmol", ankitSet) === "anmol.staff1",
);
check(
  "angad admin independent of ankit admins",
  generateAdminUsername("angad", ["ankit.admin"]) === "angad.admin",
);

// ── normalizeSlug ───────────────────────────────────────────────────────
check(
  "spaces -> hyphens",
  normalizeSlug("Ankit Kumar") === "ankit-kumar",
);
check(
  "uppercase -> lowercase",
  normalizeSlug("ANKIT") === "ankit",
);
check(
  "unsafe characters removed",
  normalizeSlug("a#b$c!") === "abc",
);
check(
  "collapsed hyphens + trimmed edges",
  normalizeSlug("--a--b--") === "a-b",
);

// ── collision handling ──────────────────────────────────────────────────
check(
  "admin collision falls back deterministically",
  generateAdminUsername("ankit", ["ankit.admin"]) === "ankit.admin-2",
);
check(
  "admin second fallback",
  generateAdminUsername("ankit", ["ankit.admin", "ankit.admin-2"]) ===
    "ankit.admin-3",
);
check(
  "staff numbering never reuses existing ids",
  !generateStaffUsername("ankit", ankitSet).startsWith("ankit.staff1"),
);

// ── master exclusion ────────────────────────────────────────────────────
check(
  "usernames never contain @ (master stays email-based)",
  !isEmailIdentifier(generateUsername("ankit", "company_admin", [])),
);
check(
  "master email routes to the email login path",
  isEmailIdentifier("master@sbbt.in") === true,
);

// ── login routing ───────────────────────────────────────────────────────
check(
  "user id routes to username lookup",
  isEmailIdentifier("ankit.admin") === false,
);
check(
  "email routes to direct sign-in",
  isEmailIdentifier("admin@sbbt.in") === true,
);
check(
  "legacy staff email routes to direct sign-in",
  isEmailIdentifier("user@sbbt.in") === true,
);
check(
  "generated usernames are always lowercase slugs",
  /^[a-z0-9][a-z0-9-]*\.[a-z0-9]+$/.test(generateUsername("Ankit Co", "staff", [])) ===
    true,
);

console.log("");
if (failures > 0) {
  console.error(`${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("All assertions passed.");
