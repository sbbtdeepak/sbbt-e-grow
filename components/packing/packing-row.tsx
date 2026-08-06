"use client";

import { memo, useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export type PackLineDraft = {
  orderItemId: string;
  productSku: string;
  productName: string;
  orderedQty: number;
  buyQty: number;
  packedQty: string;
  vendorNotes: string;
  packagingNotes: string;
  packagingDate: string;
  selected: boolean;
};

type PackingRowProps = {
  line: PackLineDraft;
  onChange: (orderItemId: string, patch: Partial<PackLineDraft>) => void;
  onToggle: (orderItemId: string, selected: boolean) => void;
};

function PackingRowBase({ line, onChange, onToggle }: PackingRowProps) {
  const packedInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);

  const buy = Number(line.buyQty) || 0;
  const packed = Number(line.packedQty) || 0;
  const pendingPacking = Math.max(0, buy - packed);

  useEffect(() => {
    // Auto-focus the packed qty input when this row is selected via checkbox.
    if (line.selected && packedInputRef.current) {
      packedInputRef.current.select();
    }
  }, [line.selected]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef?: React.RefObject<HTMLInputElement | null>,
  ) => {
    if (e.key === "Enter" && nextRef && nextRef.current) {
      e.preventDefault();
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

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
      <td className="p-1 text-right text-sm tabular-nums">{line.orderedQty}</td>

      {/* Buy Qty */}
      <td className="p-1 text-right text-sm tabular-nums">{buy}</td>

      {/* Packed Qty (editable) */}
      <td className="p-1">
        <Input
          ref={packedInputRef}
          data-pack-cell="true"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={line.packedQty}
          onChange={(e) => onChange(line.orderItemId, { packedQty: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, notesInputRef)}
          className="w-24 text-right"
          placeholder="0"
          aria-label={`Packed qty for ${line.productName}`}
        />
      </td>

      {/* Pending Packing */}
      <td
        className={`p-1 text-right text-sm tabular-nums ${
          pendingPacking > 0 ? "text-amber-600" : "text-muted-foreground"
        }`}
      >
        {pendingPacking}
      </td>

      {/* Packaging Notes (editable) */}
      <td className="p-1">
        <Input
          ref={notesInputRef}
          data-pack-cell="true"
          type="text"
          value={line.packagingNotes}
          onChange={(e) => onChange(line.orderItemId, { packagingNotes: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, undefined)}
          className="w-48 text-sm"
          placeholder="Packaging notes…"
          aria-label={`Packaging notes for ${line.productName}`}
        />
      </td>

      {/* Packaging Date (editable) */}
      <td className="p-1">
        <Input
          data-pack-cell="true"
          type="date"
          value={line.packagingDate}
          onChange={(e) => onChange(line.orderItemId, { packagingDate: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, undefined)}
          className="w-36"
          aria-label={`Packaging date for ${line.productName}`}
        />
      </td>

      {/* Vendor Notes (info only) */}
      <td className="p-1 text-sm text-muted-foreground">
        {line.vendorNotes || "—"}
      </td>
    </tr>
  );
}

/**
 * Memoized packing row.
 * Only re-renders when its own `line` reference changes.
 */
export const PackingRow = memo(PackingRowBase);
