"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityDialog } from "@/components/crud/entity-dialog";
import { ConfirmDelete } from "@/components/crud/confirm-delete";
import { PageHeader } from "@/components/layout/page-header";
import { UsageMeter } from "@/components/saas/usage-meter";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/app/(app)/products/actions";
import type { Tables } from "@/types/database";
import type { ProductInput } from "@/lib/validations/catalog";
import type { UsageStat } from "@/lib/saas/usage";

type ProductRow = Tables<"products">;

function ProductFormFields({ product }: { product?: ProductRow }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sku">SKU *</Label>
        <Input
          id="sku"
          name="sku"
          defaultValue={product?.sku ?? ""}
          placeholder="e.g. LIL-001"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Product Name *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={product?.name ?? ""}
          placeholder="e.g. Peace Lily"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="buyingPrice">Buying Price (₹) *</Label>
        <Input
          id="buyingPrice"
          name="buyingPrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product?.buying_price ?? ""}
          placeholder="0.00"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          name="category"
          defaultValue={product?.category ?? ""}
          placeholder="e.g. Indoor Plants"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input
          id="imageUrl"
          name="imageUrl"
          type="url"
          defaultValue={product?.image_url ?? ""}
          placeholder="https://example.com/plant.jpg"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="status"
          name="status"
          defaultChecked={product ? product.status === "active" : true}
        />
        <Label htmlFor="status">Active</Label>
      </div>
    </>
  );
}

const toProductInput = (formData: FormData): ProductInput => ({
  sku: String(formData.get("sku") ?? ""),
  name: String(formData.get("name") ?? ""),
  buyingPrice: Number(formData.get("buyingPrice") ?? 0),
  category: formData.get("category")
    ? String(formData.get("category"))
    : null,
  imageUrl: formData.get("imageUrl") ? String(formData.get("imageUrl")) : null,
  status: formData.get("status") !== null ? "active" : "inactive",
});

function ProductDialog({
  product,
  router,
}: {
  product?: ProductRow;
  router: ReturnType<typeof useRouter>;
}) {
  const submit = async (formData: FormData) => {
    const input = toProductInput(formData);
    const result = product
      ? await updateProduct(product.id, input)
      : await createProduct(input);
    if (result.ok) router.refresh();
    return result;
  };

  return (
    <EntityDialog
      title={product ? `Edit ${product.name}` : "Add Product"}
      description={
        product
          ? "Update the product details."
          : "Buying price only — selling price is entered at order time."
      }
      trigger={
        <Button size="sm" variant={product ? "ghost" : "default"}>
          {product ? (
            <Pencil className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {product ? null : "Add Product"}
        </Button>
      }
      onSubmit={submit}
    >
      <ProductFormFields product={product} />
    </EntityDialog>
  );
}

export function ProductsClient({
  products,
  usage,
}: {
  products: ProductRow[];
  usage: UsageStat;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const visible = products.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.category ?? "").toLowerCase().includes(query)
    );
  });
  const atLimit =
    usage.limit !== null &&
    usage.limit !== Infinity &&
    usage.usage >= usage.limit;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Products"
        description="Product master with SKU, buying price, category and status."
        actions={
          <>
            <UsageMeter stat={usage} />
            {!atLimit ? (
              <ProductDialog router={router} />
            ) : (
              <Badge variant="destructive">Product limit reached</Badge>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as typeof filter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full sm:w-64"
            aria-label="Search products"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {visible.length} product{visible.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Buying Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {products.length === 0
                    ? "No products found. Add your first product to get started."
                    : "No products match your search or filter."}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs">
                    {product.sku}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    ₹{Number(product.buying_price).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "active" ? "default" : "secondary"
                      }
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ProductDialog product={product} router={router} />
                      <ConfirmDelete
                        itemName={product.name}
                        onConfirm={async () => {
                          const result = await deleteProduct(product.id);
                          router.refresh();
                          return result;
                        }}
                        trigger={
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete ${product.name}`}
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
