"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MobileLabel,
  MobileValue,
  MobileChip,
  StaffMobileCard,
} from "@/components/staff/staff-mobile-card";
import {
  MobileScreen,
  MobileSearchToolbar,
  MobileOrderList,
  type MobileOrder,
} from "@/components/staff/staff-mobile-order-view";
import type { MarketplaceTabKey } from "@/lib/staff-navigation";
import { paymentPayload } from "@/components/staff/staff-mobile-adapters";
import type { PaymentsOrder } from "@/components/payments/payment-client";

type PaymentLine = {
  id: string;
  sku: string;
  name: string;
  expectedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  status: string;
};

const PAYMENT_STATUS_OPTIONS = ["expected", "received", "partial", "pending", "cancelled"];

export function PaymentsMobile({
  payments,
  filterMarketplace = "all",
}: {
  payments: PaymentsOrder[];
  filterMarketplace?: MarketplaceTabKey;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterSeller, setFilterSeller] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receivedAmounts, setReceivedAmounts] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const orders: MobileOrder<PaymentLine>[] = useMemo(
    () =>
      payments.map((p) => ({
        id: p.order_id,
        marketplace: { id: p.order.marketplace.id, name: p.order.marketplace.name },
        seller: { id: p.order.seller_account.id, name: p.order.seller_account.name },
        orderDate: p.delivery_date ?? "",
        lines: [
          {
            id: p.id,
            sku: p.order_id.slice(0, 8),
            name: p.order.seller_account.name,
            expectedAmount: Number(p.amount_expected),
            receivedAmount: Number(p.amount_received),
            pendingAmount: Number(p.pending),
            status: p.status,
          },
        ],
      })),
    [payments],
  );

  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of payments) map.set(p.order.seller_account.id, p.order.seller_account.name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [payments]);

  const statusFiltered = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.lines[0].status === statusFilter);
  }, [orders, statusFilter]);

  const toneOf = (status: string): "neutral" | "primary" | "success" | "warning" | "danger" => {
    if (status === "received") return "success";
    if (status === "partial" || status === "pending") return "warning";
    if (status === "expected") return "primary";
    return "neutral";
  };

  const handleSubmit = async (order: MobileOrder<PaymentLine>) => {
    const line = order.lines[0];
    setError(null);
    setPending(true);
    const result = await paymentPayload(
      { id: order.id, amount_expected: line.expectedAmount },
      receivedAmounts[order.id] ?? String(line.pendingAmount > 0 ? line.pendingAmount : line.expectedAmount),
      methods[order.id] ?? "",
      references[order.id] ?? "",
      notes[order.id] ?? "",
    );
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Payment failed.");
      return;
    }
    router.refresh();
    setExpandedId(null);
  };

  return (
    <MobileScreen title="Payments">
      <MobileSearchToolbar search={search} onSearchChange={setSearch} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Select value={filterSeller} onValueChange={setFilterSeller}>
          <SelectTrigger className="h-10 w-max shrink-0 rounded-xl text-sm">
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
          <SelectTrigger className="h-10 w-max shrink-0 rounded-xl text-sm">
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
      </div>

      {error ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <MobileOrderList
        orders={statusFiltered}
        filtersSearch={search}
        filterMarketplace={filterMarketplace}
        filterSeller={filterSeller}
        emptyText="No payment records found."
        renderCard={(order) => {
          const line = order.lines[0];
          const expanded = expandedId === order.id;
          return (
            <StaffMobileCard key={order.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span className="text-sm font-semibold">{line.name}</span>
                  <span className="text-xs text-muted-foreground">{order.seller.name}</span>
                </div>
                <MobileChip tone={toneOf(line.status)}>{line.status}</MobileChip>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3">
                <div className="flex flex-col">
                  <MobileLabel>Expected</MobileLabel>
                  <MobileValue>₹{line.expectedAmount.toLocaleString("en-IN")}</MobileValue>
                </div>
                <div className="flex flex-col">
                  <MobileLabel>Received</MobileLabel>
                  <MobileValue>₹{line.receivedAmount.toLocaleString("en-IN")}</MobileValue>
                </div>
                <div className="flex flex-col">
                  <MobileLabel>Pending</MobileLabel>
                  <MobileValue className="text-amber-600">
                    ₹{line.pendingAmount.toLocaleString("en-IN")}
                  </MobileValue>
                </div>
              </div>

              <Button
                type="button"
                variant={expanded ? "outline" : "default"}
                className="mt-3 h-11 w-full rounded-xl text-base"
                onClick={() => setExpandedId(expanded ? null : order.id)}
              >
                {expanded ? "Hide" : line.pendingAmount > 0 ? "Receive Payment" : "Edit Payment"}
              </Button>

              {expanded ? (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <MobileLabel>Amount Received</MobileLabel>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={
                        receivedAmounts[order.id] ??
                        String(line.pendingAmount > 0 ? line.pendingAmount : line.expectedAmount)
                      }
                      onChange={(e) =>
                        setReceivedAmounts((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      className="h-11 rounded-xl text-base"
                      aria-label="Amount received"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <MobileLabel>Method</MobileLabel>
                    <Input
                      value={methods[order.id] ?? ""}
                      onChange={(e) => setMethods((prev) => ({ ...prev, [order.id]: e.target.value }))}
                      placeholder="UPI, Bank, Cash…"
                      className="h-11 rounded-xl text-base"
                      aria-label="Payment method"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <MobileLabel>Reference</MobileLabel>
                    <Input
                      value={references[order.id] ?? ""}
                      onChange={(e) =>
                        setReferences((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder="UTR / Ref No…"
                      className="h-11 rounded-xl text-base"
                      aria-label="Payment reference"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <MobileLabel>Notes</MobileLabel>
                    <Input
                      value={notes[order.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [order.id]: e.target.value }))}
                      placeholder="Optional notes…"
                      className="h-11 rounded-xl text-base"
                      aria-label="Payment notes"
                    />
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 w-full rounded-xl text-base"
                    disabled={pending}
                    onClick={() => handleSubmit(order)}
                  >
                    <Check className="size-5" />
                    {pending ? "Saving…" : line.pendingAmount > 0 ? "Confirm Payment" : "Save Payment"}
                  </Button>
                </div>
              ) : null}
            </StaffMobileCard>
          );
        }}
      />
    </MobileScreen>
  );
}