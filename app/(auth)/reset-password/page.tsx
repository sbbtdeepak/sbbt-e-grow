import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getSessionContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new password for your account.",
};

export default async function ResetPasswordPage() {
  const ctx = await getSessionContext();

  // Inactive accounts are redirected to /suspended (existing behavior).
  if (ctx && !ctx.isActive) {
    redirect("/suspended");
  }

  // The form is only usable inside a Supabase recovery session, which is
  // established by the auth callback after the user follows the emailed
  // link. A normal (non-recovery) session gets the invalid-link state
  // instead of a password form that could never succeed.
  const canReset = ctx?.isRecovery === true;

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-sm">
        {canReset ? (
          <>
            <CardHeader className="gap-1">
              <CardTitle className="text-2xl">Set a new password</CardTitle>
              <CardDescription>
                Choose a strong password for your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResetPasswordForm />
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
                This password reset link is invalid or has expired. Request a
                new one to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
