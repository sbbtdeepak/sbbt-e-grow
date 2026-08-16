import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getSessionContext } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Set your password",
  description: "Create the password for your new account.",
};

export default async function SetPasswordPage() {
  const ctx = await getSessionContext();

  // No session — the invitation link was not accepted in this browser.
  if (!ctx) {
    redirect("/login");
  }

  // Inactive accounts are redirected to /suspended (existing behavior).
  if (!ctx.isActive) {
    redirect("/suspended");
  }

  // A recovery session belongs to the reset-password flow, not here.
  if (ctx.isRecovery) {
    redirect("/reset-password");
  }

  // The form is only usable while the durable pending-password gate is
  // armed (invitation accepted, password not yet created). Accounts that
  // already have a password get the invalid-link state instead.
  const canSet = ctx.pendingPasswordSet;

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-sm">
        {canSet ? (
          <>
            <CardHeader className="gap-1">
              <CardTitle className="text-2xl">Set your password</CardTitle>
              <CardDescription>
                Welcome! Create a password to secure your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {ctx.username ? (
                <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Your User ID
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold text-brand">
                    {ctx.username}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your User ID is assigned automatically by your company.
                    You&apos;ll use it to sign in.
                  </p>
                </div>
              ) : null}
              <SetPasswordForm />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="gap-1">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <KeyRound className="size-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Link expired or invalid</CardTitle>
              <CardDescription>
                This invitation link is invalid or has already been used.
                Contact your administrator to request a new invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Link
                href="/login"
                className="text-sm font-medium text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
