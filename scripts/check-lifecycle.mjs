#!/usr/bin/env node
/**
 * Deterministic assertions for the invitation lifecycle (Phase 24.5).
 *
 * Imports the shared pure module lib/auth/invite-state.ts (Node 24 native
 * type stripping — the module is dependency-free and uses only erasable
 * syntax) and asserts the state machine:
 *
 *   - company-admin state resolution (none / pending / confirmed) from real
 *     Auth state (invited_at / confirmed_at), never profiles.is_active
 *   - pending/resend eligibility
 *   - the durable "set your password" gate flag (set at invite, cleared on
 *     password creation — survives re-clicks/other browsers/refreshes)
 *   - invite user_metadata payload (role + gate flag) used by every invite
 *   - callback routing decision (invite acceptance → /set-password,
 *     recovery/other → /dashboard)
 *
 * Run: node Scripts/check-lifecycle.mjs
 */
import {
  INVITE_PENDING_META_KEY,
  clearPendingPasswordMeta,
  hasPendingPasswordGate,
  inviteUserData,
  isInvitePending,
  resolveCompanyAdminState,
  resolveInviteCallbackDestination,
} from "../lib/auth/invite-state.ts";

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};
console.log("Invitation lifecycle state machine check");
console.log("");

// ── resolveCompanyAdminState ────────────────────────────────────────────
check(
  "no auth user -> none",
  resolveCompanyAdminState(null) === "none",
);
check(
  "invited only (no confirmed_at) -> pending",
  resolveCompanyAdminState({ invited_at: "2026-08-16T00:00:00Z" }) === "pending",
);
check(
  "invited + confirmed -> confirmed",
  resolveCompanyAdminState({
    invited_at: "2026-08-16T00:00:00Z",
    confirmed_at: "2026-08-16T01:00:00Z",
  }) === "confirmed",
);
check(
  "confirmed without invited_at -> confirmed",
  resolveCompanyAdminState({ confirmed_at: "2026-08-16T00:00:00Z" }) === "confirmed",
);
check(
  "bare user (no timestamps) -> none",
  resolveCompanyAdminState({}) === "none",
);

// ── isInvitePending (resend eligibility) ────────────────────────────────
check(
  "pending invite eligible for resend",
  isInvitePending({ invited_at: "2026-08-16T00:00:00Z" }) === true,
);
check(
  "confirmed admin NOT eligible for resend",
  isInvitePending({
    invited_at: "2026-08-16T00:00:00Z",
    confirmed_at: "2026-08-16T01:00:00Z",
  }) === false,
);
check(
  "no user not eligible",
  isInvitePending(null) === false,
);

// ── durable pending-password gate ───────────────────────────────────────
const armed = { user_metadata: { [INVITE_PENDING_META_KEY]: true } };
const cleared = { user_metadata: { [INVITE_PENDING_META_KEY]: false } };
check(
  "gate armed when flag true",
  hasPendingPasswordGate(armed) === true,
);
check(
  "gate cleared when flag false (password set)",
  hasPendingPasswordGate(cleared) === false,
);
check(
  "gate off when no metadata",
  hasPendingPasswordGate({}) === false,
);
check(
  "gate off when no user",
  hasPendingPasswordGate(null) === false,
);
check(
  "clearPendingPasswordMeta disarms the gate",
  hasPendingPasswordGate({ user_metadata: clearPendingPasswordMeta() }) === false,
);

// ── invite user_metadata payload ────────────────────────────────────────
const adminData = inviteUserData("company_admin");
check(
  "invite payload carries the role",
  adminData.role === "company_admin",
);
check(
  "invite payload arms the pending gate",
  adminData[INVITE_PENDING_META_KEY] === true,
);
const staffData = inviteUserData("staff");
check(
  "staff payload carries the role",
  staffData.role === "staff",
);

// ── callback destination ────────────────────────────────────────────────
check(
  "invite acceptance (no next, invited) -> /set-password",
  resolveInviteCallbackDestination({ hasNext: false, invitedAt: "2026-08-16T00:00:00Z" }) === "/set-password",
);
check(
  "recovery link (has next) -> /dashboard",
  resolveInviteCallbackDestination({ hasNext: true, invitedAt: "2026-08-16T00:00:00Z" }) === "/dashboard",
);
check(
  "non-invited exchange -> /dashboard",
  resolveInviteCallbackDestination({ hasNext: false, invitedAt: null }) === "/dashboard",
);

// ── state-machine consistency spot checks ───────────────────────────────
check(
  "pending state implies resend eligible",
  resolveCompanyAdminState({ invited_at: "2026-08-16T00:00:00Z" }) === "pending" &&
    isInvitePending({ invited_at: "2026-08-16T00:00:00Z" }) === true,
);
check(
  "confirmed state implies resend NOT eligible",
  resolveCompanyAdminState({
    invited_at: "2026-08-16T00:00:00Z",
    confirmed_at: "2026-08-16T01:00:00Z",
  }) === "confirmed" &&
    isInvitePending({
      invited_at: "2026-08-16T00:00:00Z",
      confirmed_at: "2026-08-16T01:00:00Z",
    }) === false,
);

console.log("");
if (failures > 0) {
  console.error(`${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("All assertions passed.");
