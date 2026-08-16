"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPasswordAction } from "@/app/(auth)/actions";

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPasswordAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Create a password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters, with letters and numbers"
          defaultValue=""
          disabled={pending}
          aria-invalid={Boolean(state?.errors?.password)}
        />
        {state?.errors?.password ? (
          <p className="text-sm text-destructive">{state.errors.password[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          defaultValue=""
          disabled={pending}
          aria-invalid={Boolean(state?.errors?.confirmPassword)}
        />
        {state?.errors?.confirmPassword ? (
          <p className="text-sm text-destructive">
            {state.errors.confirmPassword[0]}
          </p>
        ) : null}
      </div>

      {state?.message && !state.errors ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create password"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        This is the password you&apos;ll use to sign in to your workspace.
      </p>
    </form>
  );
}
