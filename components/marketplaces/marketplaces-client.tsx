"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Store, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityDialog } from "@/components/crud/entity-dialog";
import { ConfirmDelete } from "@/components/crud/confirm-delete";
import { PageHeader } from "@/components/layout/page-header";
import {
  createMarketplace,
  updateMarketplace,
  deleteMarketplace,
  createSellerAccount,
  updateSellerAccount,
  deleteSellerAccount,
} from "@/app/(app)/marketplaces/actions";
import type { Tables } from "@/types/database";
import type {
  MarketplaceInput,
  SellerAccountInput,
} from "@/lib/validations/catalog";

type MarketplaceRow = Tables<"marketplaces">;
type SellerAccountRow = Tables<"seller_accounts">;

export type MarketplaceWithSellers = MarketplaceRow & {
  seller_accounts: SellerAccountRow[];
};

// ============================================================
// MARKETPLACE FORM
// ============================================================

function MarketplaceFormFields({ marketplace }: { marketplace?: MarketplaceRow }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Marketplace Name *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={marketplace?.name ?? ""}
          placeholder="e.g. Amazon"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Slug *</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={marketplace?.slug ?? ""}
          placeholder="e.g. amazon"
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="isActive"
          name="isActive"
          defaultChecked={marketplace ? marketplace.is_active : true}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
    </>
  );
}

const toMarketplaceInput = (formData: FormData): MarketplaceInput => ({
  name: String(formData.get("name") ?? ""),
  slug: String(formData.get("slug") ?? ""),
  isActive: formData.get("isActive") !== null,
});

function MarketplaceDialog({
  marketplace,
  router,
}: {
  marketplace?: MarketplaceRow;
  router: ReturnType<typeof useRouter>;
}) {
  const submit = async (formData: FormData) => {
    const input = toMarketplaceInput(formData);
    const result = marketplace
      ? await updateMarketplace(marketplace.id, input)
      : await createMarketplace(input);
    if (result.ok) router.refresh();
    return result;
  };

  return (
    <EntityDialog
      title={marketplace ? `Edit ${marketplace.name}` : "Add Marketplace"}
      description={
        marketplace
          ? "Update the marketplace details."
          : "Marketplaces are dynamic — add any current or future marketplace."
      }
      trigger={
        <Button size="sm" variant={marketplace ? "ghost" : "default"}>
          {marketplace ? (
            <Pencil className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {marketplace ? null : "Add Marketplace"}
        </Button>
      }
      onSubmit={submit}
    >
      <MarketplaceFormFields marketplace={marketplace} />
    </EntityDialog>
  );
}

// ============================================================
// SELLER ACCOUNT FORM
// ============================================================

function SellerAccountFormFields({
  seller,
  marketplaces,
}: {
  seller?: SellerAccountRow;
  marketplaces: MarketplaceRow[];
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="marketplaceId">Marketplace *</Label>
        <Select
          name="marketplaceId"
          defaultValue={seller?.marketplace_id ?? marketplaces[0]?.id}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select marketplace" />
          </SelectTrigger>
          <SelectContent>
            {marketplaces.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Seller Name *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={seller?.name ?? ""}
          placeholder="e.g. Sunita"
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="isActive"
          name="isActive"
          defaultChecked={seller ? seller.is_active : true}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
    </>
  );
}

const toSellerAccountInput = (formData: FormData): SellerAccountInput => ({
  marketplaceId: String(formData.get("marketplaceId") ?? ""),
  name: String(formData.get("name") ?? ""),
  isActive: formData.get("isActive") !== null,
});

function SellerAccountDialog({
  seller,
  marketplaces,
  router,
}: {
  seller?: SellerAccountRow;
  marketplaces: MarketplaceRow[];
  router: ReturnType<typeof useRouter>;
}) {
  const submit = async (formData: FormData) => {
    const input = toSellerAccountInput(formData);
    const result = seller
      ? await updateSellerAccount(seller.id, input)
      : await createSellerAccount(input);
    if (result.ok) router.refresh();
    return result;
  };

  return (
    <EntityDialog
      title={seller ? `Edit ${seller.name}` : "Add Seller Account"}
      description="Seller accounts are unlimited per marketplace."
      trigger={
        <Button size="sm" variant={seller ? "ghost" : "outline"}>
          {seller ? (
            <Pencil className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {seller ? null : "Add Seller"}
        </Button>
      }
      onSubmit={submit}
    >
      <SellerAccountFormFields seller={seller} marketplaces={marketplaces} />
    </EntityDialog>
  );
}

// ============================================================
// SELLER ACCOUNTS DIALOG (per marketplace)
// ============================================================

function SellerAccountsDialog({
  marketplace,
  router,
}: {
  marketplace: MarketplaceWithSellers;
  router: ReturnType<typeof useRouter>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Users className="size-4" />
          Sellers ({marketplace.seller_accounts.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{marketplace.name} — Seller Accounts</DialogTitle>
          <DialogDescription>
            Manage unlimited seller accounts for this marketplace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {marketplace.seller_accounts.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No seller accounts yet. Add the first one below.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketplace.seller_accounts.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell className="font-medium">{seller.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={seller.is_active ? "default" : "secondary"}
                        >
                          {seller.is_active ? "active" : "inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <SellerAccountDialog
                            seller={seller}
                            marketplaces={[marketplace]}
                            router={router}
                          />
                          <ConfirmDelete
                            itemName={seller.name}
                            onConfirm={async () => {
                              const result = await deleteSellerAccount(seller.id);
                              router.refresh();
                              return result;
                            }}
                            trigger={
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Delete ${seller.name}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <SellerAccountDialog
            marketplaces={[marketplace]}
            router={router}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MAIN CLIENT
// ============================================================

export function MarketplacesClient({
  marketplaces,
}: {
  marketplaces: MarketplaceWithSellers[];
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Marketplaces"
        description="Create marketplaces and manage unlimited seller accounts per marketplace."
        actions={<MarketplaceDialog router={router} />}
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sellers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marketplaces.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No marketplaces yet. Add Amazon, Meesho, Flipkart or any
                  future marketplace.
                </TableCell>
              </TableRow>
            ) : (
              marketplaces.map((marketplace) => (
                <TableRow key={marketplace.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-muted-foreground" />
                      {marketplace.name}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {marketplace.slug}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={marketplace.is_active ? "default" : "secondary"}
                    >
                      {marketplace.is_active ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {marketplace.seller_accounts.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <SellerAccountsDialog
                        marketplace={marketplace}
                        router={router}
                      />
                      <MarketplaceDialog
                        marketplace={marketplace}
                        router={router}
                      />
                      <ConfirmDelete
                        itemName={marketplace.name}
                        onConfirm={async () => {
                          const result = await deleteMarketplace(marketplace.id);
                          router.refresh();
                          return result;
                        }}
                        trigger={
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete ${marketplace.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}