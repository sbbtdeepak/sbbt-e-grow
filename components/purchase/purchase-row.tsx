"use client";

import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export type PurchaseLineDraft = {
  orderItemId: string;
  productSku: string;
  productName: string;
  orderedQty: number;
  buyQty: string;
  vendorNotes: string;
  selected: boolean;
};

type PurchaseRowProps = {
  line: PurchaseLineDraft;
  onChange: (orderItemId: string, patch: Partial<PurchaseLineDraft>) => void;
  onToggle: (orderItemId: string, selected: boolean) => void;
};

function PurchaseRowBase({ line, onChange, onToggle }: PurchaseRowProps) {
  const ordered = Number(line.orderedQty) || 0;
  const buy = Number(line.buyQty) || 0;
  const pendingQty = Math.max(0, ordered - buy);

  return (
    <tr className="border-b border-border hover:bg-muted/40">
      {/* Select */}
      <td className="p-1 text-center">
        <Checkbox
          checked={line.selected}
          onCheckedChange={(checked) =>
            onToggle(line.orderItemId, checked === true)
          }
          aria-label={`Select ${line.productName}`}
        />
      </td>

      {/* Product */}
      <td className="p-1">
        <div className="flex flex-col">
          <span className="font-mono text-xs text-muted-foreground">
            {line.productSku}
          </span>
          <span className="text-sm font-medium">{line.productName}</span>
        </div>
      </td>

      {/* Ordered Qty */}
      <td className="p-1 text-right text-sm tabular-nums">
        {ordered}
      </td>

      {/* Buy Qty (editable) */}
      <td className="p-1">
        <Input
          data-purchase-cell="true"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={line.buyQty}
          onChange={(e) =>
            onChange(line.orderItemId, { buyQty: e.target.value })
          }
          className="w-24 text-right"
          placeholder="0"
          aria-label={`Buy qty for ${line.productName}`}
        />
      </td>

      {/* Pending Qty */}
      <td
        className={`p-1 text-right text-sm tabular-nums ${
          pendingQty > 0 ? "text-amber-600" : "text-muted-foreground"
        }`}
      >
        {pendingQty}
      </td>

      {/* Vendor Notes */}
      <td className="p-1">
        <Input
          data-purchase-cell="true"
          type="text"
          value={line.vendorNotes}
          onChange={(e) =>
            onChange(line.orderItemId, { vendorNotes: e.target.value })
          }
          className="w-full"
          placeholder="Vendor notes…"
          aria-label={`Vendor notes for ${line.productName}`}
        />
      </td>
    </tr>
  );
}

/**
 * Memoized purchase row.
 * Only re-renders when its own `line` reference changes.
 */
export const PurchaseRow = memo(PurchaseRowBase);