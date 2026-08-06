"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { DeliveryRow, type DeliveryLineDraft } from "@/components/delivery/delivery-row";
import { confirmDelivery } from "@/app/(app)/delivery/actions";
import type { Tables } from "@/types/database";
import type { DeliveryStatus } from "@/lib/validations/order";

type OrderRow = Tables<"orders">;
type OrderItemRow = Tables<"order_items">;
type MarketplaceRow = Tables<"marketplaces">;
type SellerAccountRow = Tables<"seller_accounts">;
type ProductRow = Tables<"products">;

export type DeliveryOrder = OrderRow & {
  marketplace: MarketplaceRow;
  seller_account: SellerAccountRow;
  order_items: (OrderItemRow & { product: ProductRow })[];
};

type DeliveryClientProps = {
  orders: DeliveryOrder[];
};

const DELIVERY_STATUS_OPTIONS = ["Delivered", "Partial", "Cancelled", "Returned", "RTO"];

export function DeliveryClient({ orders }: DeliveryClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Search filters
  const [search, setSearch] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [referenceFilter, setReferenceFilter] = useState("");

  // Per-order line drafts
  const [drafts, setDrafts] = useState<Record<string, DeliveryLineDraft[]>>(() => {
    const initial: Record<string, DeliveryLineDraft[]> = {};
    for (const order of orders) {
      initial[order.id] = order.order_items.map((item) => ({
        orderItemId: item.id,
        productSku: item.product.sku,
        productName: item.product.name,
        orderedQty: Number(item.ordered_qty),
        buyQty: Number(item.buy_qty),
        packedQty: Number(item.packed_qty),
        dispatchQty: Number(item.dispatch_qty),
        deliveredQty: String(item.dispatch_qty), // auto-copy dispatch → delivered
        deliveryStatus: item.delivery_status ?? "",
        deliveryReference: item.delivery_reference ?? "",
        deliveryDate: item.delivery_date ?? "",
        deliveryNotes: item.delivery_notes ?? "",
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
      if (statusFilter !== "all") {
        const lineMatch = order.order_items.some(
          (item) => (item.delivery_status ?? "") === statusFilter,
        );
        if (!lineMatch) return false;
      }
      if (referenceFilter.trim()) {
        const ref = referenceFilter.trim().toLowerCase();
        const refMatch = order.order_items.some(
          (item) => (item.delivery_reference ?? "").toLowerCase().includes(ref),
        );
        if (!refMatch) return false;
      }
      if (q) {
        const orderNo = order.id.slice(0, 8).toLowerCase();
        const marketplace = order.marketplace.name.toLowerCase();
        const seller = order.seller_account.name.toLowerCase();
        const productMatch = order.order_items.some(
          (item) =>
            item.product.name.toLowerCase().includes(q) ||
            item.product.sku.toLowerCase().includes(q),
        );
        const courierMatch = order.order_items.some(
          (item) =>
            (item.courier_name ?? "").toLowerCase().includes(q) ||
            (item.tracking_number ?? "").toLowerCase().includes(q),
        );
        if (
          !orderNo.includes(q) &&
          !marketplace.includes(q) &&
          !seller.includes(q) &&
          !productMatch &&
          !courierMatch
        ) {
          return false;
        }
      }
      return true;
    });
  }, [orders, search, marketplaceFilter, sellerFilter, dateFilter, statusFilter, referenceFilter]);

  const updateLine = useCallback(
    (orderId: string, orderItemId: string, patch: Partial<DeliveryLineDraft>) => {
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

  const handleConfirm = (order: DeliveryOrder) => {
    setError(null);
    const lines = drafts[order.id] ?? [];
    const selectedLines = lines.filter((l) => l.selected);

    if (selectedLines.length === 0) {
      setError("Select at least one line to confirm.");
      return;
    }

    startTransition(async () => {
      const result = await confirmDelivery({
        orderId: order.id,
        lines: selectedLines.map((l) => ({
          orderItemId: l.orderItemId,
          deliveredQty: Number(l.deliveredQty) || 0,
          deliveryStatus: l.deliveryStatus
            ? (l.deliveryStatus as DeliveryStatus)
            : null,
          deliveryReference: l.deliveryReference.trim() ? l.deliveryReference.trim() : null,
          deliveryDate: l.deliveryDate.trim() ? l.deliveryDate.trim() : null,
          deliveryNotes: l.deliveryNotes.trim() ? l.deliveryNotes.trim() : null,
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
        title="Delivery"
        description="Confirm delivery status. Dispatch qty auto-copies to delivered qty. After confirm, parcels are marked as delivered."
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
            placeholder="Search by order no, marketplace, seller, product, courier, tracking…"
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {DELIVERY_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="text"
          value={referenceFilter}
          onChange={(e) => setReferenceFilter(e.target.value)}
          placeholder="Reference…"
          className="w-40"
          aria-label="Filter by reference"
        />
      </div>

      {/* Orders */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No delivery orders found. Complete dispatch from the Dispatch module
          first.
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
                <table className="w-full min-w-[1200px] border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="w-10 p-1 text-center text-xs font-medium">Sel</th>
                      <th className="p-1 text-left text-xs font-medium">Product</th>
                      <th className="w-28 p-1 text-right text-xs font-medium">Ordered Qty</th>
                      <th className="w-24 p-1 text-right text-xs font-medium">Buy Qty</th>
                      <th className="w-24 p-1 text-right text-xs font-medium">Packed Qty</th>
                      <th className="w-28 p-1 text-right text-xs font-medium">Dispatch Qty</th>
                      <th className="w-28 p-1 text-right text-xs font-medium">Delivered Qty</th>
                      <th className="w-20 p-1 text-right text-xs font-medium">Pending</th>
                      <th className="w-32 p-1 text-left text-xs font-medium">Status</th>
                      <th className="w-36 p-1 text-left text-xs font-medium">Reference</th>
                      <th className="w-36 p-1 text-left text-xs font-medium">Date</th>
                      <th className="p-1 text-left text-xs font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <DeliveryRow
                        key={line.orderItemId}
                        line={line}
                        onChange={(id, patch) => updateLine(order.id, id, patch)}
                        onToggle={(id, sel) => toggleLine(order.id, id, sel)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
