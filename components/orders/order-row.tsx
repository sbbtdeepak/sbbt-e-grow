"use client";

import { memo, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ProductCombobox,
  type ProductOption,
} from "@/components/orders/product-combobox";

export type OrderRowDraft = {
  localId: number;
  productId: string | null;
  productSku: string | null;
  productName: string | null;
  orderedQty: string;
  sellingPrice: string;
  buyingPrice: string;
};

export const createEmptyRow = (localId: number): OrderRowDraft => ({
  localId,
  productId: null,
  productSku: null,
  productName: null,
  orderedQty: "",
  sellingPrice: "",
  buyingPrice: "",
});

type OrderRowProps = {
  row: OrderRowDraft;
  productOptions: ProductOption[];
  onChange: (localId: number, patch: Partial<OrderRowDraft>) => void;
  onRemove: (localId: number) => void;
  onEnterOnLastCell: () => void;
  autoFocus?: boolean;
  onAutoFocused?: () => void;
  inputClassName?: string;
};

function fmtINR(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function OrderRowBase({
  row,
  productOptions,
  onChange,
  onRemove,
  onEnterOnLastCell,
  autoFocus,
  onAutoFocused,
  inputClassName,
}: OrderRowProps) {
  const productCellRef = useRef<HTMLDivElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      productCellRef.current?.querySelector("button")?.focus();
      onAutoFocused?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const qty = Number(row.orderedQty) || 0;
  const sell = Number(row.sellingPrice) || 0;
  const buy = Number(row.buyingPrice) || 0;
  const totalSale = sell * qty;
  const totalPurchase = buy * qty;
  const profit = totalSale - totalPurchase;

  const handleProductSelect = (product: ProductOption) => {
    onChange(row.localId, {
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      buyingPrice: String(product.buyingPrice),
      sellingPrice: product.sellingPrice != null ? String(product.sellingPrice) : row.sellingPrice,
    });
    // Immediately focus the quantity cell for rapid entry.
    requestAnimationFrame(() => {
      qtyRef.current?.focus();
      qtyRef.current?.select();
    });
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    isLastCell: boolean,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isLastCell) {
        onEnterOnLastCell();
        return;
      }
      // Move focus to the next input in the grid.
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          'input[data-order-cell="true"]:not([disabled])',
        ),
      );
      const idx = inputs.indexOf(e.currentTarget);
      const next = inputs[idx + 1];
      if (next) {
        next.focus();
        next.select();
      }
    }
  };

  return (
    <tr className="border-b border-border hover:bg-muted/40">
      {/* Product (autocomplete) */}
      <td className="p-1">
        <div ref={productCellRef} className="min-w-[220px]">
          <ProductCombobox
            options={productOptions}
            value={row.productId}
            onSelect={handleProductSelect}
          />
        </div>
      </td>

      {/* Ordered Qty */}
      <td className="p-1">
        <Input
          ref={qtyRef}
          data-order-cell="true"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={row.orderedQty}
          onChange={(e) =>
            onChange(row.localId, { orderedQty: e.target.value })
          }
          onKeyDown={(e) => handleCellKeyDown(e, false)}
          className={`w-24 text-right ${inputClassName ?? ""}`}
          placeholder="0"
          aria-label={`Quantity for line ${row.localId}`}
        />
      </td>

      {/* Selling Price (default from Product Master, editable per order) */}
      <td className="p-1">
        <Input
          data-order-cell="true"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={row.sellingPrice}
          onChange={(e) =>
            onChange(row.localId, { sellingPrice: e.target.value })
          }
          onKeyDown={(e) => handleCellKeyDown(e, false)}
          className={`w-28 text-right ${inputClassName ?? ""}`}
          placeholder="0.00"
          aria-label={`Selling price for line ${row.localId}`}
        />
      </td>

      {/* Buying Price (auto from product) */}
      <td className="p-1">
        <Input
          data-order-cell="true"
          value={row.buyingPrice}
          readOnly
          disabled
          className="w-28 text-right"
          aria-label={`Buying price for line ${row.localId}`}
        />
      </td>

      {/* Total Sale (auto) */}
      <td className="p-1 text-right text-sm tabular-nums">
        {fmtINR(totalSale)}
      </td>

      {/* Total Purchase (auto) */}
      <td className="p-1 text-right text-sm tabular-nums">
        {fmtINR(totalPurchase)}
      </td>

      {/* Profit (auto) */}
      <td
        className={`p-1 text-right text-sm tabular-nums ${
          profit < 0 ? "text-destructive" : ""
        }`}
      >
        {fmtINR(profit)}
      </td>

      {/* Remove */}
      <td className="p-1 text-center">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`Remove line ${row.localId}`}
          onClick={() => onRemove(row.localId)}
        >
          <Trash2 className="size-4" />
        </Button>
      </td>
    </tr>
  );
}

/**
 * Memoized row component.
 *
 * Only re-renders when its own `row` reference changes or when
 * product options / callbacks change. With 500+ rows this keeps
 * typing in one row from re-rendering every other row.
 */
export const OrderRow = memo(OrderRowBase);