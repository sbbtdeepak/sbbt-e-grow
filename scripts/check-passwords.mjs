#!/usr/bin/env node
/**
 * Deterministic assertions for Phase 24.8 (account credential lifecycle).
 *
 * Imports the shared pure modules lib/auth/passwords.ts and
 * lib/auth/invite-state.ts (Node 24 native type stripping — dependency-free,
 * erasable syntax only) and asserts:
 *
 *   - temporary password shape (length + char classes) and uniqueness
 *   - honest account-status resolution (setup_pending / active / suspended /
 *     invited / none) — never "active" merely because a profile exists
 *   - the durable pending-password gate (armed at create/reset, cleared on
 *     password creation)
 *   - the invite user_metadata payload used by create/reset (role + gate)
 *
 * Run: node Scripts/check-passwords.mjs
 */
import {
  generateTemporaryPassword,
  passwordShapeOk,
} from "../lib/auth/passwords.ts";
import {
  INVITE_PENDING_META_KEY,
  clearPendingPasswordMeta,
  hasPendingPasswordGate,
  inviteUserData,
  resolveAccountStatus,
} from "../lib/auth/invite-state.ts";

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};
console.log("Account credential lifecycle check (Phase 24.8)");
console.log("");

// ── Temporary password generation ───────────────────────────────────────
const pw = generateTemporaryPassword();
check(
  "temporary password has shape (>=12, upper, lower, digit, symbol)",
  passwordShapeOk(pw),
  pw.length > 16 ? `len=${pw.length}` : `len=${pw.length}`,
);
check(
  "temporary password does not contain ambiguous chars 0/O/1/l/I",
  !/[0O1lI]/.test(pw),
);

const sample = new Set();
for (let i = 0; i < 25; i++) sample.add(generateTemporaryPassword());
check(
  "25 generated passwords are all unique",
  sample.size === 25,
);

// ── Honest account status resolution ────────────────────────────────────
check(
  "no auth user -> none",
  resolveAccountStatus(null, true) === "none",
);
check(
  "inactive profile -> suspended (even with gate armed)",
  resolveAccountStatus(
    { user_metadata: { [INVITE_PENDING_META_KEY]: true } },
    false,
  ) === "suspended",
);
check(
  "gate armed -> setup_pending (email-confirmed but no password yet)",
  resolveAccountStatus(
    {
      confirmed_at: "2026-08-16T00:00:00Z",
      user_metadata: { [INVITE_PENDING_META_KEY]: true },
    },
    true,
  ) === "setup_pending",
);
check(
  "legacy invite pending (invited, not confirmed) -> invited",
  resolveAccountStatus(
    { invited_at: "2026-08-16T00:00:00Z" },
    true,
  ) === "invited",
);
check(
  "confirmed + gate cleared -> active",
  resolveAccountStatus(
    {
      confirmed_at: "2026-08-16T00:00:00Z",
      user_metadata: { [INVITE_PENDING_META_KEY]: false },
    },
    true,
  ) === "active",
);
check(
  "confirmed + no metadata -> active (legacy seed accounts)",
  resolveAccountStatus({ confirmed_at: "2026-08-16T00:00:00Z" }, true) ===
    "active",
);

// ── Durable pending-password gate ───────────────────────────────────────
const armed = { user_metadata: { [INVITE_PENDING_META_KEY]: true } };
const cleared = { user_metadata: { [INVITE_PENDING_META_KEY]: false } };
check("gate armed when flag true", hasPendingPasswordGate(armed) === true);
check("gate cleared when flag false", hasPendingPasswordGate(cleared) === false);
check(
  "clearPendingPasswordMeta disarms the gate",
  hasPendingPasswordGate({ user_metadata: clearPendingPasswordMeta() }) ===
    false,
);

// ── user_metadata payload used by create/reset ──────────────────────────
const adminPayload = inviteUserData("company_admin");
check(
  "create/reset payload carries the role",
  adminPayload.role === "company_admin",
);
check(
  "create/reset payload arms the pending gate",
  adminPayload[INVITE_PENDING_META_KEY] === true,
);
const staffPayload = inviteUserData("staff");
check(
  "staff payload carries the role",
  staffPayload.role === "staff",
);
check(
  "staff payload arms the pending gate",
  staffPayload[INVITE_PENDING_META_KEY] === true,
);

// ── Consistency: setup_pending implies the gate is armed ────────────────
check(
  "setup_pending implies armed gate",
  resolveAccountStatus(armed, true) === "setup_pending" &&
    hasPendingPasswordGate(armed) === true,
);

console.log("");
if (failures > 0) {
  console.error(`${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("All assertions passed.");
