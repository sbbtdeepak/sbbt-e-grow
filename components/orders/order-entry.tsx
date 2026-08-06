"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import {
  OrderRow,
  createEmptyRow,
  type OrderRowDraft,
} from "@/components/orders/order-row";
import type { ProductOption } from "@/components/orders/product-combobox";
import { saveOrderDraft, confirmOrderEntry } from "@/app/(app)/orders/actions";
import type { Tables } from "@/types/database";

type MarketplaceRow = Tables<"marketplaces">;
type SellerAccountRow = Tables<"seller_accounts">;

const fmtINR = (value: number): string =>
  value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function OrderEntryClient({
  marketplaces,
  sellerAccountsByMarketplace,
  products,
}: {
  marketplaces: MarketplaceRow[];
  sellerAccountsByMarketplace: Record<string, SellerAccountRow[]>;
  products: ProductOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [orderDate, setOrderDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [marketplaceId, setMarketplaceId] = useState<string>("");
  const [sellerAccountId, setSellerAccountId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [rows, setRows] = useState<OrderRowDraft[]>(() => [createEmptyRow(1)]);
  const localIdRef = useRef(2);

  const [error, setError] = useState<string | null>(null);

  const activeSellers = useMemo(
    () =>
      marketplaceId
        ? sellerAccountsByMarketplace[marketplaceId] ?? []
        : [],
    [marketplaceId, sellerAccountsByMarketplace],
  );

  const updateRow = useCallback(
    (localId: number, patch: Partial<OrderRowDraft>) => {
      setRows((prev) =>
        prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const removeRow = useCallback((localId: number) => {
    setRows((prev) => prev.filter((r) => r.localId !== localId));
  }, []);

  const addRow = useCallback(() => {
    const newRow = createEmptyRow(localIdRef.current);
    localIdRef.current += 1;
    setRows((prev) => [...prev, newRow]);
  }, []);

  const handleEnterOnLastCell = useCallback(() => {
    const lastRow = rows[rows.length - 1];
    if (lastRow && lastRow.productId !== null) {
      addRow();
    }
  }, [rows, addRow]);

  const totals = useMemo(() => {
    let totalSale = 0;
    let totalPurchase = 0;
    let totalProfit = 0;
    for (const r of rows) {
      const qty = Number(r.orderedQty) || 0;
      const sell = Number(r.sellingPrice) || 0;
      const buy = Number(r.buyingPrice) || 0;
      totalSale += sell * qty;
      totalPurchase += buy * qty;
      totalProfit += sell * qty - buy * qty;
    }
    return { totalSale, totalPurchase, totalProfit };
  }, [rows]);

  const buildInput = () => ({
    orderDate,
    marketplaceId,
    sellerAccountId,
    notes: notes.trim() ? notes : null,
    lines: rows
      .filter((r) => r.productId !== null)
      .map((r) => ({
        productId: r.productId as string,
        orderedQty: Number(r.orderedQty) || 0,
        sellingPrice: Number(r.sellingPrice) || 0,
        buyingPrice: Number(r.buyingPrice) || 0,
      })),
  });

  const handleSubmit = (mode: "draft" | "confirm") => {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "draft"
          ? await saveOrderDraft(buildInput())
          : await confirmOrderEntry(buildInput());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Reset the form after successful save/confirm.
      setRows([createEmptyRow(1)]);
      localIdRef.current = 2;
      setOrderDate(new Date().toISOString().slice(0, 10));
      setMarketplaceId("");
      setSellerAccountId("");
      setNotes("");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Order Entry"
        description="Excel-like entry — Enter moves to the next cell. Buying price auto-fills from product."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => handleSubmit("draft")}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Save Draft
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => handleSubmit("confirm")}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm Entry
            </Button>
          </div>
        }
      />

      {error ? (
        <p
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {/* Order header */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="orderDate">Date *</Label>
          <Input
            id="orderDate"
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Marketplace *</Label>
          <Select
            value={marketplaceId}
            onValueChange={(v) => {
              setMarketplaceId(v);
              setSellerAccountId("");
            }}
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
          <Label>Seller Account *</Label>
          <Select
            value={sellerAccountId}
            onValueChange={setSellerAccountId}
            disabled={marketplaceId === "" || activeSellers.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  marketplaceId === ""
                    ? "Select marketplace first"
                    : "Select seller"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {activeSellers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes…"
            rows={2}
          />
        </div>
      </div>

      {/* Order lines */}
      <div className="overflow-auto rounded-lg border bg-card">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[240px]">Product</TableHead>
              <TableHead className="w-28 text-right">Ordered Qty</TableHead>
              <TableHead className="w-32 text-right">Selling Price</TableHead>
              <TableHead className="w-32 text-right">Buying Price</TableHead>
              <TableHead className="text-right">Total Sale</TableHead>
              <TableHead className="text-right">Total Purchase</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <OrderRow
                key={row.localId}
                row={row}
                productOptions={products}
                onChange={updateRow}
                onRemove={removeRow}
                onEnterOnLastCell={handleEnterOnLastCell}
              />
            ))}
            <TableRow>
              <TableCell className="p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addRow()}
                >
                  <Plus className="size-4" />
                  Add line
                </Button>
              </TableCell>
              <TableCell colSpan={7} />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Grand totals */}
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:justify-end sm:gap-8">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Grand Total Sale</span>
          <span className="font-semibold tabular-nums">
            {fmtINR(totals.totalSale)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Grand Total Purchase</span>
          <span className="font-semibold tabular-nums">
            {fmtINR(totals.totalPurchase)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Grand Profit</span>
          <span
            className={`font-semibold tabular-nums ${
              totals.totalProfit < 0 ? "text-destructive" : ""
            }`}
          >
            {fmtINR(totals.totalProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}