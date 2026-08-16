#!/usr/bin/env node
/**
 * Deterministic assertions for the invitation redirect configuration.
 *
 * The single source of truth is getSiteUrl() in lib/site.ts, which reads
 * NEXT_PUBLIC_APP_URL (trailing slashes trimmed) and falls back to
 * http://localhost:3000 in development. Every invitation uses
 * `${getSiteUrl()}/auth/callback` via getInviteRedirectUrl().
 *
 * This script replays that exact rule against the environment (or a local
 * .env.local) and fails loudly if a deployed/production configuration would
 * ever emit a localhost invitation callback.
 *
 * Run: node Scripts/check-invite-redirect.mjs
 *   (optionally with NEXT_PUBLIC_APP_URL set, or --production to require it)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const requireProduction = args.includes("--production");

let configured = process.env.NEXT_PUBLIC_APP_URL;

// Load .env.local if present and NEXT_PUBLIC_APP_URL is not already set.
if (!configured) {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const match = line.match(/^NEXT_PUBLIC_APP_URL\s*=\s*(.+)\s*$/);
      if (match) {
        configured = match[1].trim();
        break;
      }
    }
  }
}

const siteUrl = (configured ?? "")
  .trim()
  .replace(/\/+$/, "");
const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(siteUrl);
const isDevConfig = !configured || isLocalhost;
const redirect = `${siteUrl || "http://localhost:3000"}/auth/callback`;

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

console.log("Invitation redirect configuration check");
console.log(`  NEXT_PUBLIC_APP_URL: ${configured ? "set" : "(unset)"}`);
console.log(`  getSiteUrl(): ${siteUrl || "http://localhost:3000 (fallback)"}`);
console.log(`  redirectTo:  ${redirect}`);
console.log("");

check(
  "Invitation callback always ends in /auth/callback",
  redirect.endsWith("/auth/callback"),
  redirect,
);

if (isDevConfig) {
  // Unset, or explicitly localhost — a development configuration.
  check(
    "Development configuration stays on localhost",
    redirect.startsWith("http://localhost"),
    redirect,
  );
} else {
  // A real domain is configured — it must never resolve to localhost.
  check(
    "No trailing slash in origin",
    !/\/+$/.test(siteUrl),
    siteUrl,
  );
  check(
    "Invitation callback never contains localhost when a domain is configured",
    !redirect.includes("localhost") && redirect.startsWith("https://"),
    redirect,
  );
  check(
    "Invitation callback matches the configured origin",
    redirect === `${siteUrl}/auth/callback`,
    redirect,
  );
}

if (requireProduction) {
  check(
    "Production requires NEXT_PUBLIC_APP_URL (no localhost fallback)",
    !isDevConfig,
  );
  check(
    "Production redirect must be the deployed origin",
    redirect === "https://sbbt-e-grow.vercel.app/auth/callback",
    redirect,
  );
}

console.log("");
if (failures > 0) {
  console.error(`${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("All assertions passed.");
