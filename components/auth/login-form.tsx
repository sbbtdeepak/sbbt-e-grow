"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signInAction } from "@/app/(auth)/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, undefined);
  // Local-only password visibility toggle — never stored or logged.
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            defaultValue=""
            className={cn("pr-10")}
            aria-invalid={Boolean(state?.errors?.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
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
