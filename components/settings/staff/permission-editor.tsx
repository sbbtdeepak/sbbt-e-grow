"use client";

import {
  MASTER_DATA_PERMISSIONS,
  OPERATIONAL_PERMISSIONS,
  ANALYTICS_PERMISSIONS,
  type Permission,
} from "@/lib/auth/permissions";
import type { StaffMember } from "@/app/(app)/settings/staff/actions";

type PermissionGroup = {
  label: string;
  permissions: Permission[];
};

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Operations",
    permissions: OPERATIONAL_PERMISSIONS,
  },
  {
    label: "Analytics",
    permissions: ANALYTICS_PERMISSIONS,
  },
  {
    label: "Master Data",
    permissions: MASTER_DATA_PERMISSIONS,
  },
];

const PERMISSION_LABELS: Record<string, string> = {
  orders: "Orders",
  purchase: "Purchase",
  packing: "Packing",
  dispatch: "Dispatch",
  delivery: "Delivery",
  payments: "Payments",
  reports: "Reports",
  products: "Products",
  marketplaces: "Marketplaces",
  seller_accounts: "Seller Accounts",
};

type PermissionEditorProps = {
  member: StaffMember;
  onChange: (userId: string, permission: string, isAllowed: boolean) => void;
};

/**
 * Permission editor rendered inside each staff row.
 * Master-data permission checkboxes are disabled for staff —
 * those are always controlled by role (canMutateMasterData).
 */
export function PermissionEditor({ member, onChange }: PermissionEditorProps) {
  const isStaff = member.role === "staff";
  const isDisabled = !member.isActive;

  return (
    <div className="mt-4 space-y-3">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {group.label}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {group.permissions.map((perm) => {
              const isMasterData =
                isStaff && MASTER_DATA_PERMISSIONS.includes(perm);
              const checked = member.permissions[perm] === true;
              const disabled = isDisabled || isMasterData;

              return (
                <label
                  key={perm}
                  className={`flex items-center gap-2 text-sm ${
                    disabled ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(member.id, perm, e.target.checked)
                    }
                    className="size-4"
                  />
                  {PERMISSION_LABELS[perm] ?? perm}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
