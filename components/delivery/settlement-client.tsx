"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search, AlertTriangle, Clock, Lock } from "lucide-react";

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
import { updateDeliverySettlement } from "@/app/(app)/delivery/actions";
import type { Tables } from "@/types/database";

type OrderRow = Tables<"orders">;
type OrderItemRow = Tables<"order_items">;
type MarketplaceRow = Tables<"marketplaces">;
type SellerAccountRow = Tables<"seller_accounts">;
type ProductRow = Tables<"products">;

type SettlementOrder = OrderRow & {
  marketplace: MarketplaceRow;
  seller_account: SellerAccountRow;
  order_items: (OrderItemRow & { product: ProductRow })[];
};

type SettlementClientProps = {
  orders: SettlementOrder[];
};

function fmtINR(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function isWithinSettlementWindow(deliveryConfirmedAt: string | null): boolean {
  if (!deliveryConfirmedAt) return false;
  const confirmedAt = new Date(deliveryConfirmedAt);
  const fiveDaysLater = new Date(confirmedAt);
  fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
  return new Date() <= fiveDaysLater;
}

function daysRemaining(deliveryConfirmedAt: string | null): number {
  if (!deliveryConfirmedAt) return 0;
  const confirmedAt = new Date(deliveryConfirmedAt);
  const fiveDaysLater = new Date(confirmedAt);
  fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
  const now = new Date();
  const diff = fiveDaysLater.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function SettlementClient({ orders }: SettlementClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");

  const [drafts, setDrafts] = useState<Record<string, DeliveryLineDraft[]>>(() => {
    const initial: Record<string, DeliveryLineDraft[]> = {};
    for (const order of orders) {
      initial[order.id] = order.order_items.map((item) => ({
        orderItemId: item.id,
        productSku: item.product.sku,
        productName: item.product.name,
        sellingPrice: Number(item.selling_price),
        orderedQty: Number(item.ordered_qty),
        buyQty: Number(item.buy_qty),
        packedQty: Number(item.packed_qty),
        dispatchQty: Number(item.dispatch_qty),
        deliveredQty: String(Math.floor(Number(item.delivered_qty))),
        returnedQty: String(Math.floor(Number(item.returned_qty))),
        rtoQty: String(Math.floor(Number(item.rto_qty))),
        cancelledQty: String(Math.floor(Number(item.cancelled_qty))),
        returnChargePerUnit: String(Number(item.return_charge_per_unit)),
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
      if (q) {
        const orderNo = order.id.slice(0, 8).toLowerCase();
        const marketplace = order.marketplace.name.toLowerCase();
        const seller = order.seller_account.name.toLowerCase();
        const productMatch = order.order_items.some(
          (item) =>
            item.product.name.toLowerCase().includes(q) ||
            item.product.sku.toLowerCase().includes(q),
        );
        if (!orderNo.includes(q) && !marketplace.includes(q) && !seller.includes(q) && !productMatch) {
          return false;
        }
      }
      return true;
    });
  }, [orders, search, marketplaceFilter, sellerFilter]);

  const updateLine = useCallback(
    (orderId: string, orderItemId: string, patch: Partial<DeliveryLineDraft>) => {
      setDrafts((prev) => ({
        ...prev,
        [orderId]: (prev[orderId] ?? []).map((l) => {
          if (l.orderItemId !== orderItemId) return l;
          const updated = { ...l, ...patch };
          // Auto-default return charge to ₹140 when returnedQty becomes > 0
          // and return charge was 0
          if (
            patch.returnedQty !== undefined &&
            Number(updated.returnedQty) > 0 &&
            Number(l.returnChargePerUnit) === 0 &&
            patch.returnChargePerUnit === undefined
          ) {
            updated.returnChargePerUnit = "140";
          }
          return updated;
        }),
      }));
      setLineErrors((prev) => {
        const next = { ...prev };
        delete next[orderItemId];
        return next;
      });
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

  const validateLines = useCallback((orderId: string): string | null => {
    const lines = drafts[orderId] ?? [];
    const errors: Record<string, string> = {};
    let hasError = false;

    for (const line of lines) {
      if (!line.selected) continue;
      const delivered = Math.floor(Number(line.deliveredQty) || 0);
      const returned = Math.floor(Number(line.returnedQty) || 0);
      const rto = Math.floor(Number(line.rtoQty) || 0);
      const cancelled = Math.floor(Number(line.cancelledQty) || 0);
      const dispatch = line.dispatchQty;

      if (delivered < 0 || returned < 0 || rto < 0 || cancelled < 0) {
        errors[line.orderItemId] = "Quantities cannot be negative";
        hasError = true;
        continue;
      }
      const total = delivered + returned + rto + cancelled;
      if (total > dispatch) {
        errors[line.orderItemId] = `Total (${total}) exceeds Dispatch Qty (${dispatch})`;
        hasError = true;
        continue;
      }
      if (total < dispatch) {
        errors[line.orderItemId] = `${dispatch - total} qty still unaccounted`;
        hasError = true;
        continue;
      }
    }

    setLineErrors(errors);
    if (hasError) return Object.values(errors)[0] ?? "Validation failed";
    return null;
  }, [drafts]);

  const handleSave = (order: SettlementOrder) => {
    setError(null);
    setLineErrors({});
    const lines = drafts[order.id] ?? [];
    const selectedLines = lines.filter((l) => l.selected);

    if (selectedLines.length === 0) {
      setError("Select at least one line to update.");
      return;
    }

    const validationError = validateLines(order.id);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const getDerivedStatus = (l: DeliveryLineDraft) => {
        const d = Math.floor(Number(l.deliveredQty) || 0);
        const r = Math.floor(Number(l.returnedQty) || 0);
        const rt = Math.floor(Number(l.rtoQty) || 0);
        const c = Math.floor(Number(l.cancelledQty) || 0);
        const dispatch = l.dispatchQty;
        if (d + r + rt + c === 0) return null;
        if (r > 0 && d > 0) return "Partial";
        if (r > 0) return "Returned";
        if (rt > 0 && d > 0) return "Partial";
        if (rt === dispatch) return "RTO";
        if (c === dispatch) return "Cancelled";
        if (d === dispatch) return "Delivered";
        return "Partial";
      };

      const result = await updateDeliverySettlement({
        orderId: order.id,
        lines: selectedLines.map((l) => ({
          orderItemId: l.orderItemId,
          deliveredQty: Math.floor(Number(l.deliveredQty) || 0),
          returnedQty: Math.floor(Number(l.returnedQty) || 0),
          rtoQty: Math.floor(Number(l.rtoQty) || 0),
          cancelledQty: Math.floor(Number(l.cancelledQty) || 0),
          returnChargePerUnit: Number(l.returnChargePerUnit) || 0,
          deliveryStatus: getDerivedStatus(l),
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
        title="Delivery Settlement"
        description="Edit delivery outcomes within 5 days of confirmation. Updates recalculate the expected payment."
      />

      {error ? (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Search bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order no, marketplace, seller, product…"
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
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No recent completed deliveries found. Only orders confirmed within the last 5 days appear here.
        </div>
      ) : (
        filteredOrders.map((order) => {
          const lines = drafts[order.id] ?? [];
          const selectedLines = lines.filter((l) => l.selected);
          const selectedCount = selectedLines.length;
          const allSelected = lines.length > 0 && selectedCount === lines.length;
          const editable = isWithinSettlementWindow(order.delivery_confirmed_at);
          const remaining = daysRemaining(order.delivery_confirmed_at);

          let orderNetContribution = 0;
          for (const l of selectedLines) {
            const d = Math.floor(Number(l.deliveredQty) || 0);
            const r = Math.floor(Number(l.returnedQty) || 0);
            const charge = Number(l.returnChargePerUnit) || 0;
            orderNetContribution += d * l.sellingPrice - r * charge;
          }

          return (
            <div key={order.id} className="overflow-hidden rounded-lg border bg-card">
              {/* Order header */}
              <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{order.id.slice(0, 8)}
                    </span>
                    <Badge variant={editable ? "default" : "secondary"}>
                      {editable ? (
                        <><Clock className="mr-1 size-3" />{remaining}d left</>
                      ) : (
                        <><Lock className="mr-1 size-3" />Expired</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium">{order.marketplace.name}</span>
                    <span className="text-muted-foreground">{order.seller_account.name}</span>
                    <span className="text-muted-foreground">{order.order_date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedCount > 0 && (
                    <div className="hidden text-right text-xs sm:block">
                      <div className="text-muted-foreground">
                        Expected: <span className="font-medium text-foreground">{fmtINR(orderNetContribution)}</span>
                      </div>
                    </div>
                  )}
                  {editable && (
                    <>
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
                        onClick={() => handleSave(order)}
                      >
                        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        Save ({selectedCount})
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Line errors */}
              {Object.keys(lineErrors).length > 0 && (
                <div className="border-b bg-destructive/5 px-4 py-2">
                  {Object.entries(lineErrors).map(([itemId, errMsg]) => {
                    const line = lines.find((l) => l.orderItemId === itemId);
                    return (
                      <div key={itemId} className="flex items-center gap-2 text-xs text-destructive">
                        <AlertTriangle className="size-3" />
                        <span className="font-medium">{line?.productName ?? itemId.slice(0, 8)}:</span>
                        <span>{errMsg}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Order lines */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1400px] border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="w-10 p-1 text-center text-xs font-medium">Sel</th>
                      <th className="p-1 text-left text-xs font-medium">Product</th>
                      <th className="w-16 p-1 text-right text-xs font-medium">Ordered</th>
                      <th className="w-16 p-1 text-right text-xs font-medium">Packed</th>
                      <th className="w-16 p-1 text-right text-xs font-medium">Dispatch</th>
                      <th className="w-20 p-1 text-right text-xs font-medium">Delivered</th>
                      <th className="w-20 p-1 text-right text-xs font-medium">Returned</th>
                      <th className="w-20 p-1 text-right text-xs font-medium">RTO</th>
                      <th className="w-20 p-1 text-right text-xs font-medium">Cancelled</th>
                      <th className="w-16 p-1 text-right text-xs font-medium">Left</th>
                      <th className="w-24 p-1 text-right text-xs font-medium">Return ₹/Unit</th>
                      <th className="w-32 p-1 text-left text-xs font-medium">Reference</th>
                      <th className="w-32 p-1 text-left text-xs font-medium">Date</th>
                      <th className="w-20 p-1 text-right text-xs font-medium">Net ₹</th>
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
