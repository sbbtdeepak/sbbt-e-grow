"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PermissionEditor } from "@/components/settings/staff/permission-editor";
import { TemporaryCredentials } from "@/components/auth/temporary-credentials";
import { inviteSchema } from "@/lib/validations/staff";
import type { StaffMember } from "@/app/(app)/settings/staff/actions";
import {
  inviteStaff,
  activateStaff,
  deactivateStaff,
  updateStaffPermission,
  removeStaff,
  resetStaffPassword,
} from "@/app/(app)/settings/staff/actions";

type StaffClientProps = {
  staff: StaffMember[];
};

type InviteForm = { email: string; fullName?: string };

export function StaffClient({ staff }: StaffClientProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One-time temporary credentials from invite/reset — shown in a dialog.
  const [credentials, setCredentials] = useState<{
    username: string;
    email: string;
    temporaryPassword: string;
    title: string;
  } | null>(null);

  const list = staff;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  const handleInvite = async (data: InviteForm) => {
    setSaving(true);
    setError(null);
    const result = await inviteStaff(data.email, data.fullName);
    if (!result.ok) {
      setError(result.error);
    } else {
      setInviteOpen(false);
      reset();
      if (result.data.temporaryPassword) {
        // Show the one-time credentials; reload the list on dismiss.
        setCredentials({
          username: result.data.username ?? "",
          email: result.data.email,
          temporaryPassword: result.data.temporaryPassword,
          title: "Staff account created",
        });
      } else {
        // Existing-user association path — no new password to show.
        window.location.reload();
      }
    }
    setSaving(false);
  };

  const handleResetPassword = async (userId: string) => {
    setError(null);
    const result = await resetStaffPassword(userId);
    if (!result.ok) {
      setError(result.error);
    } else {
      setCredentials({
        username: result.data.username ?? "",
        email: result.data.email,
        temporaryPassword: result.data.temporaryPassword,
        title: "Password reset — temporary password",
      });
    }
  };

  const handleActivate = async (userId: string) => {
    const result = await activateStaff(userId);
    if (!result.ok) setError(result.error);
    else window.location.reload();
  };

  const handleDeactivate = async (userId: string) => {
    const result = await deactivateStaff(userId);
    if (!result.ok) setError(result.error);
    else window.location.reload();
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this staff member from the company?")) return;
    const result = await removeStaff(userId);
    if (!result.ok) setError(result.error);
    else window.location.reload();
  };

  const handlePermissionChange = async (
    userId: string,
    permission: string,
    isAllowed: boolean,
  ) => {
    const result = await updateStaffPermission(userId, permission, isAllowed);
    if (!result.ok) setError(result.error);
  };

  const pendingStaff = list.filter((s) => !s.isActive);

  return (
    <div className="flex flex-col gap-6 p-6">
      {credentials ? (
        <Dialog
          open={credentials !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCredentials(null);
              window.location.reload();
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{credentials.title}</DialogTitle>
              <DialogDescription>
                Share these credentials with the user securely. They will not
                be shown again.
              </DialogDescription>
            </DialogHeader>
            <TemporaryCredentials
              title={credentials.title}
              username={credentials.username}
              email={credentials.email}
              temporaryPassword={credentials.temporaryPassword}
            />
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setCredentials(null);
                  window.location.reload();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <PageHeader
        title="Staff"
        description="Manage company staff, their permissions, and activation status."
        actions={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 size-4" />
                Invite Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit(handleInvite)}>
                <DialogHeader>
                  <DialogTitle>Invite Staff</DialogTitle>
                  <DialogDescription>
                    Enter an email to create a staff account. A temporary
                    password is generated and shown once — the first login
                    requires setting a personal password.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="staff@example.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="fullName">Full Name (optional)</Label>
                    <Input
                      id="fullName"
                      placeholder="Jane Doe"
                      {...register("fullName")}
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setInviteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Inviting…" : "Send Invite"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {pendingStaff.length > 0 && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            {pendingStaff.length} staff member(s) pending activation.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {list.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No staff members yet. Invite someone to get started.
          </Card>
        ) : (
          list.map((member) => (
            <StaffRow
              key={member.id}
              member={member}
              onActivate={handleActivate}
              onDeactivate={handleDeactivate}
              onRemove={handleRemove}
              onResetPassword={handleResetPassword}
              onPermissionChange={handlePermissionChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

type StaffRowProps = {
  member: StaffMember;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onRemove: (id: string) => void;
  onResetPassword: (id: string) => void;
  onPermissionChange: (
    userId: string,
    permission: string,
    isAllowed: boolean,
  ) => void;
};

function StaffRow({
  member,
  onActivate,
  onDeactivate,
  onRemove,
  onResetPassword,
  onPermissionChange,
}: StaffRowProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {member.fullName || member.email || "Unnamed"}
            </span>
            <Badge variant={member.isActive ? "default" : "secondary"}>
              {member.isActive ? "Active" : "Inactive"}
            </Badge>
            {member.invitationStatus === "pending" && (
              <Badge variant="outline">Invitation pending</Badge>
            )}
            {member.pendingPasswordSetup && (
              <Badge
                variant="outline"
                className="border-amber-300/70 text-amber-700 dark:border-amber-500/40 dark:text-amber-400"
              >
                Password setup pending
              </Badge>
            )}
          </div>
          {member.username ? (
            <p className="font-mono text-sm text-foreground">
              {member.username}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onResetPassword(member.id)}
            title="Generate a new temporary password"
          >
            Reset password
          </Button>
          {member.isActive ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeactivate(member.id)}
            >
              Deactivate
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => onActivate(member.id)}>
              Activate
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(member.id)}
          >
            Remove
          </Button>
        </div>
      </div>

      <PermissionEditor
        member={member}
        onChange={onPermissionChange}
      />
    </Card>
  );
}
