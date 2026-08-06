"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
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
import { PageHeader } from "@/components/layout/page-header";
import { PurchaseRow, type PurchaseLineDraft } from "@/components/purchase/purchase-row";
import { confirmPurchase } from "@/app/(app)/purchase/actions";
import type { Tables } from "@/types/database";

type OrderRow = Tables<"orders">;
type OrderItemRow = Tables<"order_items">;
type MarketplaceRow = Tables<"marketplaces">;
type SellerAccountRow = Tables<"seller_accounts">;
type ProductRow = Tables<"products">;

export type PurchaseOrder = OrderRow & {
  marketplace: MarketplaceRow;
  seller_account: SellerAccountRow;
  order_items: (OrderItemRow & { product: ProductRow })[];
};

type PurchaseClientProps = {
  orders: PurchaseOrder[];
};

export function PurchaseClient({ orders }: PurchaseClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Search filters
  const [search, setSearch] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Per-order line drafts
  const [drafts, setDrafts] = useState<Record<string, PurchaseLineDraft[]>>(() => {
    const initial: Record<string, PurchaseLineDraft[]> = {};
    for (const order of orders) {
      initial[order.id] = order.order_items.map((item) => ({
        orderItemId: item.id,
        productSku: item.product.sku,
        productName: item.product.name,
        orderedQty: Number(item.ordered_qty),
        buyQty: String(item.buy_qty),
        vendorNotes: item.vendor_notes ?? "",
        selected: false,
      }));
    }
    return initial;
  });

  const marketplaces = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) map.set(o.marketplace.id, o.marketplace.name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) map.set(o.seller_account.id, o.seller_account.name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (marketplaceFilter !== "all" && order.marketplace_id !== marketplaceFilter) return false;
      if (sellerFilter !== "all" && order.seller_account_id !== sellerFilter) return false;
      if (dateFilter && order.order_date !== dateFilter) return false;
      if (q) {
        const orderNo = order.id.slice(0, 8).toLowerCase();
        const marketplace = order.marketplace.name.toLowerCase();
        const seller = order.seller_account.name.toLowerCase();
        const productMatch = order.order_items.some(
          (item) =>
            item.product.name.toLowerCase().includes(q) ||
            item.product.sku.toLowerCase().includes(q),
        );
        if (
          !orderNo.includes(q) &&
          !marketplace.includes(q) &&
          !seller.includes(q) &&
          !productMatch
        ) {
          return false;
        }
      }
      return true;
    });
  }, [orders, search, marketplaceFilter, sellerFilter, dateFilter]);

  const updateLine = useCallback(
    (orderId: string, orderItemId: string, patch: Partial<PurchaseLineDraft>) => {
      setDrafts((prev) => ({
        ...prev,
        [orderId]: (prev[orderId] ?? []).map((l) =>
          l.orderItemId === orderItemId ? { ...l, ...patch } : l,
        ),
      }));
    },
    [],
  );

  const toggleLine = useCallback(
    (orderId: string, orderItemId: string, selected: boolean) => {
      setDrafts((prev) => ({
        ...prev,
        [orderId]: (prev[orderId] ?? []).map((l) =>
          l.orderItemId === orderItemId ? { ...l, selected } : l,
        ),
      }));
    },
    [],
  );

  const selectAll = useCallback((orderId: string, selected: boolean) => {
    setDrafts((prev) => ({
      ...prev,
      [orderId]: (prev[orderId] ?? []).map((l) => ({ ...l, selected })),
    }));
  }, []);

  const handleConfirm = (order: PurchaseOrder) => {
    setError(null);
    const lines = drafts[order.id] ?? [];
    const selectedLines = lines.filter((l) => l.selected);

    if (selectedLines.length === 0) {
      setError("Select at least one line to confirm.");
      return;
    }

    startTransition(async () => {
      const result = await confirmPurchase({
        orderId: order.id,
        lines: selectedLines.map((l) => ({
          orderItemId: l.orderItemId,
          buyQty: Number(l.buyQty) || 0,
          vendorNotes: l.vendorNotes.trim() ? l.vendorNotes.trim() : null,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Purchase"
        description="Confirm purchases for confirmed order entries. Buy qty auto-copies from ordered qty."
      />

      {error ? (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {/* Search bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order no, marketplace, seller, or product…"
            className="pl-9"
          />
        </div>
        <Select value={marketplaceFilter} onValueChange={setMarketplaceFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Marketplace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All marketplaces</SelectItem>
            {marketplaces.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sellerFilter} onValueChange={setSellerFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Seller" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sellers</SelectItem>
            {sellers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-40"
          aria-label="Filter by date"
        />
      </div>

      {/* Orders */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No confirmed order entries found. Confirm entries from the Orders
          module first.
        </div>
      ) : (
        filteredOrders.map((order) => {
          const lines = drafts[order.id] ?? [];
          const selectedCount = lines.filter((l) => l.selected).length;
          const allSelected = lines.length > 0 && selectedCount === lines.length;

          return (
            <div key={order.id} className="overflow-hidden rounded-lg border bg-card">
              {/* Order header */}
              <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{order.id.slice(0, 8)}
                    </span>
                    <Badge variant="secondary">{order.stage}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium">{order.marketplace.name}</span>
                    <span className="text-muted-foreground">
                      {order.seller_account.name}
                    </span>
                    <span className="text-muted-foreground">
                      {order.order_date}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectAll(order.id, !allSelected)}
                  >
                    {allSelected ? "Clear all" : "Select all"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || selectedCount === 0}
                    onClick={() => handleConfirm(order)}
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Confirm ({selectedCount})
                  </Button>
                </div>
              </div>

              {/* Order lines */}
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">Sel</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Ordered Qty</TableHead>
                      <TableHead className="text-right">Buy Qty</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Vendor Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <PurchaseRow
                        key={line.orderItemId}
                        line={line}
                        onChange={(id, patch) => updateLine(order.id, id, patch)}
                        onToggle={(id, sel) => toggleLine(order.id, id, sel)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}