"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StaffMobileCard, MobileLabel } from "@/components/staff/staff-mobile-card";
import { MobileOrderList, MobileOrderHeader, MobileQtyGrid, MobileScreen, MobileSearchToolbar } from "@/components/staff/staff-mobile-order-view";
import { useStaffStore } from "@/lib/staff-store";

export type StageItem = {
  id: string;
  sku: string;
  name: string;
  referenceQty: number;
};

export type StageOrder = {
  id: string;
  marketplace: { id: string; name: string };
  seller: { id: string; name: string };
  orderDate: string;
  stage: string;
  items: StageItem[];
};

export type StageValueField = {
  key: string;
  label: string;
  type?: "number" | "text" | "date" | "select";
  placeholder?: string;
  textarea?: boolean;
  options?: string[];
};

export type StageSelected = {
  orderId: string;
  itemId: string;
  values: Record<string, string>;
};

type StageViewProps = {
  orders: StageOrder[];
  title: string;
  confirmLabel: string;
  fields: StageValueField[];
  initialValues: (item: StageItem) => Record<string, string>;
  buildPayload: (selected: StageSelected[]) => Promise<{ ok: boolean; error?: string }>;
};

type DraftLine = {
  selected: boolean;
  values: Record<string, string>;
};

export function StageMobileView({ orders, title, confirmLabel, fields, initialValues, buildPayload }: StageViewProps) {
  const store = useStaffStore();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, DraftLine[]>>(() => {
    const initial: Record<string, DraftLine[]> = {};
    for (const order of orders) {
      initial[order.id] = order.items.map((item) => ({
        selected: false,
        values: initialValues(item),
      }));
    }
    return initial;
  });

  const patch = (orderId: string, index: number, patchObj: Partial<DraftLine>) =>
    setDrafts((prev) => ({ ...prev, [orderId]: prev[orderId].map((l, i) => (i === index ? { ...l, ...patchObj } : l)) }));

  const count = useMemo(
    () => orders.reduce((acc, o) => acc + (drafts[o.id] ? drafts[o.id] : []).filter((l) => l.selected).length, 0),
    [orders, drafts],
  );

  const submit = () => {
    if (count === 0) {
      setError("Select at least one line to confirm.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const selected: StageSelected[] = [];
      for (const order of orders) {
        const lines = drafts[order.id] ? drafts[order.id] : [];
        lines.forEach((l, i) => {
          if (l.selected) selected.push({ orderId: order.id, itemId: order.items[i].id, values: l.values });
        });
      }
      const result = await buildPayload(selected);
      if (!result.ok) {
        setError(result.error ? result.error : "Action failed.");
        return;
      }
      router.refresh();
    });
  };

  const mobileOrders = orders.map((o) => ({
    id: o.id,
    marketplace: o.marketplace,
    seller: o.seller,
    orderDate: o.orderDate,
    lines: o.items.map((i) => ({ id: i.id, sku: i.sku, name: i.name })),
  }));


  return (
    <MobileScreen title={title}>
      <MobileSearchToolbar search={search} onSearchChange={setSearch} />
      <MobileOrderList
        orders={mobileOrders}
        filtersSearch={search}
        filterMarketplace={store.marketplaceFilter}
        renderCard={(order) => {
          const source = orders.find((o) => o.id === order.id);
          if (!source) return null;
          const lines = drafts[order.id] ? drafts[order.id] : [];
          const selectedCount = lines.filter((l) => l.selected).length;
          return (
            <StaffMobileCard key={order.id}>
              <MobileOrderHeader orderNo={order.id} marketplace={order.marketplace.name} seller={order.seller.name} orderDate={order.orderDate} />
              <MobileQtyGrid
                items={[
                  { label: "Items", value: source.items.length },
                  { label: "Selected", value: selectedCount },
                  { label: "Stage", value: source.stage, tone: "primary" },
                ]}
              />
              <div className="mt-3 flex flex-col gap-3">
                {source.items.map((item, i) => {
                  const line = lines[i];
                  if (!line) return null;
                  return (
                    <div key={item.id} className="rounded-xl border p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={line.selected}
                          onCheckedChange={(c2) => patch(order.id, i, { selected: c2 === true })}
                          className="mt-1 size-5"
                          aria-label={"Select " + item.name}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="font-mono text-[10px] uppercase text-muted-foreground">{item.sku}</span>
                          <span className="truncate text-sm font-medium">{item.name}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-3">
                        {fields.map((field) => (
                          <div key={field.key} className="flex flex-col gap-1">
                            <MobileLabel>{field.label}</MobileLabel>
                            {field.type === "select" && field.options ? (
                              <Select
                                value={line.values[field.key] ? line.values[field.key] : ""}
                                onValueChange={(v) =>
                                  patch(order.id, i, { values: { ...line.values, [field.key]: v } })
                                }
                              >
                                <SelectTrigger className="h-11 rounded-xl text-base">
                                  <SelectValue placeholder={field.placeholder} />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field.textarea ? (
                              <Textarea
                                value={line.values[field.key] ? line.values[field.key] : ""}
                                onChange={(e) =>
                                  patch(order.id, i, { values: { ...line.values, [field.key]: e.target.value } })
                                }
                                rows={2}
                                className="rounded-xl text-base"
                                aria-label={field.label + " for " + item.name}
                              />
                            ) : (
                              <Input
                                type={field.type ? field.type : "text"}
                                inputMode={field.type === "number" ? "decimal" : undefined}
                                min={field.type === "number" ? "0" : undefined}
                                step={field.type === "number" ? "0.01" : undefined}
                                value={line.values[field.key] ? line.values[field.key] : ""}
                                onChange={(e) =>
                                  patch(order.id, i, { values: { ...line.values, [field.key]: e.target.value } })
                                }
                                className="h-11 rounded-xl text-base"
                                placeholder={field.placeholder}
                                aria-label={field.label + " for " + item.name}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </StaffMobileCard>
          );
        }}
      />
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        {error ? <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null}
        <Button
          type="button"
          size="lg"
          className="h-12 w-full rounded-xl text-base"
          disabled={pending || count === 0}
          onClick={submit}
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
          {confirmLabel}
          {count > 0 ? " (" + count + ")" : ""}
        </Button>
      </div>
    </MobileScreen>
  );
}