"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, Eye, EyeOff, KeyRound } from "lucide-react";

import { cn } from "@/lib/utils";

type TemporaryCredentialsProps = {
  /** Application User ID, e.g. acme.staff1. */
  username: string;
  email: string;
  /** Plaintext temporary password — shown ONCE, never stored. */
  temporaryPassword: string;
  title?: string;
};

/**
 * One-time credential display shown to the authorized creator immediately
 * after account creation / password reset.
 *
 * - Reveal and Copy are strictly local UI (component state + clipboard).
 * - Warns that the password will not be shown again — after this card is
 *   dismissed, the plaintext is not retrievable from the database.
 * - Never logs, stores, or transmits the password anywhere except the
 *   user's own clipboard on explicit Copy.
 */
export function TemporaryCredentials({
  username,
  email,
  temporaryPassword,
  title = "Account created",
}: TemporaryCredentialsProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — reveal stays on.
      setCopied(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
          <KeyRound className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            Sign-in credentials — shown only once.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 ring-1 ring-inset ring-border">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            User ID
          </span>
          <span className="font-mono font-semibold text-foreground">
            {username}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 ring-1 ring-inset ring-border">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Email
          </span>
          <span className="truncate font-mono text-foreground">{email}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-background/70 px-3 py-2 ring-1 ring-inset ring-border">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Temporary password
          </span>
          <span className="ml-auto font-mono font-semibold text-foreground">
            {revealed ? temporaryPassword : "••••••••••••"}
          </span>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            {revealed ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "rounded-md p-1 transition-colors hover:bg-muted",
              copied ? "text-emerald-600" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Copy password"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Save this password now — it will not be shown again and cannot be
          retrieved later. The account&apos;s first login requires changing it.
        </span>
      </p>
    </div>
  );
}
