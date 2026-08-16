"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "@/app/(auth)/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="identifier">User ID</Label>
        <Input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder="e.g. ankit.admin"
          defaultValue=""
          aria-invalid={Boolean(state?.errors?.identifier)}
        />
        {state?.errors?.identifier ? (
          <p className="text-sm text-destructive">{state.errors.identifier[0]}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Your User ID is assigned automatically by your company. You can also
          sign in with your registered email.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          defaultValue=""
          aria-invalid={Boolean(state?.errors?.password)}
        />
        {state?.errors?.password ? (
          <p className="text-sm text-destructive">
            {state.errors.password[0]}
          </p>
        ) : null}
      </div>

      {state?.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
