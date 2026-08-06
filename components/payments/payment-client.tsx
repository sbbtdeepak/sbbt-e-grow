"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentRow, type PaymentDraft } from "@/components/payments/payment-row";
import { createExpectedPayment, receivePayment } from "@/app/(app)/payments/actions";
import type { Tables } from "@/types/database";

type PaymentRow = Tables<"payments">;
type OrderRow = Tables<"orders">;
type MarketplaceRow = Tables<"marketplaces">;
type SellerAccountRow = Tables<"seller_accounts">;

export type PaymentsOrder = PaymentRow & {
  order: OrderRow & {
    marketplace: MarketplaceRow;
    seller_account: SellerAccountRow;
  };
};

type PaymentClientProps = {
  payments: PaymentsOrder[];
};

const PAYMENT_STATUS_OPTIONS = ["expected", "received", "partial", "pending", "cancelled"];

export function PaymentClient({ payments }: PaymentClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"create" | "receive">("create");

  // Search filters
  const [search, setSearch] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [referenceFilter, setReferenceFilter] = useState("");

  // Per-payment drafts
  const [drafts, setDrafts] = useState<Record<string, PaymentDraft[]>>(() => {
    const initial: Record<string, PaymentDraft[]> = {};
    for (const p of payments) {
      initial[p.id] = [
        {
          paymentId: p.id,
          orderId: p.order_id,
          orderNo: p.order_id.slice(0, 8),
          marketplace: p.order.marketplace.name,
          seller: p.order.seller_account.name,
          deliveryDate: p.delivery_date ?? "",
          expectedDate: p.expected_payment_date ?? "",
          expectedAmount: Number(p.amount_expected),
          receivedAmount: Number(p.amount_received),
          pendingAmount: Number(p.pending),
          status: p.status,
          paymentMethod: p.payment_method ?? "",
          paymentReference: p.payment_reference ?? "",
          receivedDate: p.payment_received_date ?? "",
          notes: p.payment_notes ?? "",
          selected: false,
        },
      ];
    }
    return initial;
  });

  const marketplaces = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of payments) map.set(p.order.marketplace.id, p.order.marketplace.name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [payments]);

  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of payments) map.set(p.order.seller_account.id, p.order.seller_account.name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (marketplaceFilter !== "all" && p.order.marketplace_id !== marketplaceFilter) return false;
      if (sellerFilter !== "all" && p.order.seller_account_id !== sellerFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (dateFilter && p.expected_payment_date !== dateFilter) return false;
      if (referenceFilter.trim()) {
        const ref = referenceFilter.trim().toLowerCase();
        if ((p.payment_reference ?? "").toLowerCase().indexOf(ref) === -1) return false;
      }
      if (q) {
        const orderNo = p.order_id.slice(0, 8).toLowerCase();
        const marketplace = p.order.marketplace.name.toLowerCase();
        const seller = p.order.seller_account.name.toLowerCase();
        if (
          !orderNo.includes(q) &&
          !marketplace.includes(q) &&
          !seller.includes(q) &&
          (p.payment_reference ?? "").toLowerCase().indexOf(q) !== -1
        ) {
          // keep if reference matches
        } else if (
          !orderNo.includes(q) &&
          !marketplace.includes(q) &&
          !seller.includes(q) &&
          (p.payment_reference ?? "").toLowerCase().indexOf(q) === -1
        ) {
          return false;
        }
      }
      return true;
    });
  }, [payments, search, marketplaceFilter, sellerFilter, statusFilter, dateFilter, referenceFilter]);

  const toggleLine = useCallback((paymentId: string, selected: boolean) => {
    setDrafts((prev) => ({
      ...prev,
      [paymentId]: (prev[paymentId] ?? []).map((l) => ({ ...l, selected })),
    }));
  }, []);

const handleAction = async () => {
  setError(null);
  const selectedLines = Object.values(drafts)
    .flat()
    .filter((l) => l.selected);
  if (selectedLines.length === 0) {
    setError("Select at least one payment.");
    return;
  }

  startTransition(async () => {
    for (const line of selectedLines) {
      const input = {
        orderId: line.orderId,
        amountExpected: line.expectedAmount,
        amountReceived: line.receivedAmount,
        paymentMethod: line.paymentMethod || null,
        paymentReference: line.paymentReference || null,
        paymentNotes: line.notes || null,
      };
      const result =
        actionType === "create"
          ? await createExpectedPayment(input)
          : await receivePayment(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
    }
    router.refresh();
  });
};

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Payments"
        description="Expected payments from delivered orders. Create expected payments and record received amounts."
      />

      {error ? (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order no, marketplace, seller, reference…"
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
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
        <Input
          type="text"
          value={referenceFilter}
          onChange={(e) => setReferenceFilter(e.target.value)}
          placeholder="Reference…"
          className="w-40"
          aria-label="Filter by reference"
        />
      </div>

      {filteredPayments.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No payment records found. Deliver orders first.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
<Button
  type="button"
  size="sm"
  variant={actionType === "create" ? "default" : "outline"}
  onClick={() => {
    setActionType("create");
    handleAction();
  }}
>
  <Plus className="size-4" />
  Create Expected
</Button>
<Button
  type="button"
  size="sm"
  variant={actionType === "receive" ? "default" : "outline"}
  onClick={() => {
    setActionType("receive");
    handleAction();
  }}
>
  <Check className="size-4" />
  Receive Payment
</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-10 p-1 text-center text-xs font-medium">Sel</th>
                  <th className="p-1 text-left text-xs font-medium">Order No</th>
                  <th className="p-1 text-left text-xs font-medium">Marketplace</th>
                  <th className="p-1 text-left text-xs font-medium">Seller</th>
                  <th className="p-1 text-left text-xs font-medium">Delivery Date</th>
                  <th className="p-1 text-left text-xs font-medium">Expected Date</th>
                  <th className="w-28 p-1 text-right text-xs font-medium">Expected Amt</th>
                  <th className="w-28 p-1 text-right text-xs font-medium">Received Amt</th>
                  <th className="w-24 p-1 text-right text-xs font-medium">Pending</th>
                  <th className="w-28 p-1 text-left text-xs font-medium">Status</th>
                  <th className="p-1 text-left text-xs font-medium">Method</th>
                  <th className="p-1 text-left text-xs font-medium">Reference</th>
                  <th className="p-1 text-left text-xs font-medium">Received Date</th>
                  <th className="p-1 text-left text-xs font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const lines = drafts[payment.id] ?? [];
                  return (
                    <PaymentRow
                      key={payment.id}
                      line={lines[0]}
                      onToggle={(id, sel) => toggleLine(id, sel)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}