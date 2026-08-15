import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your SBBT workspace.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="gap-1">
          <CardTitle className="text-2xl">SBBT E-Grow</CardTitle>
          <CardDescription>
            Sign in to manage your live plant e-commerce business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}