import { Lock } from "lucide-react";

export default function SuspendedPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Lock className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold">Account Suspended</h1>
        <p className="text-sm text-muted-foreground">
          Your account has been deactivated by your company administrator.
          Contact them if you believe this was done in error.
        </p>
      </div>
    </div>
  );
}
