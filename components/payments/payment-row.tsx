"use client";

import { memo } from "react";

import { Badge } from "@/components/ui/badge";

export type PaymentDraft = {
  paymentId: string;
  orderId: string;
  orderNo: string;
  marketplace: string;
  seller: string;
  deliveryDate: string;
  expectedDate: string;
  expectedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  status: string;
  paymentMethod: string;
  paymentReference: string;
  receivedDate: string;
  notes: string;
  selected: boolean;
};

type PaymentRowProps = {
  line: PaymentDraft;
  onToggle: (paymentId: string, selected: boolean) => void;
};

const STATUS_COLORS: Record<string, string> = {
  expected: "bg-blue-100 text-blue-800",
  received: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  pending: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
};

function fmtINR(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function PaymentRowBase({ line, onToggle }: PaymentRowProps) {
  const isNegative = line.expectedAmount < 0;
  const isZero = line.expectedAmount === 0;

  return (
    <tr className="border-b border-border hover:bg-muted/40">
      <td className="p-1 text-center">
        <input
          type="checkbox"
          checked={line.selected}
          onChange={(e) => onToggle(line.paymentId, e.target.checked)}
          className="size-4 rounded border-border"
          aria-label={`Select ${line.orderNo}`}
        />
      </td>
      <td className="p-1 text-sm font-mono">{line.orderNo}</td>
      <td className="p-1 text-sm">{line.marketplace}</td>
      <td className="p-1 text-sm">{line.seller}</td>
      <td className="p-1 text-sm tabular-nums">{line.deliveryDate}</td>
      <td className="p-1 text-sm tabular-nums">{line.expectedDate}</td>
      <td className="p-1 text-right text-sm tabular-nums">
        {isZero ? (
          <span className="text-muted-foreground">No Payment</span>
        ) : isNegative ? (
          <span className="text-destructive font-medium">₹{fmtINR(Math.abs(line.expectedAmount))}</span>
        ) : (
          <span className="text-foreground">₹{fmtINR(line.expectedAmount)}</span>
        )}
      </td>
      <td className="p-1 text-right text-sm tabular-nums">
        ₹{fmtINR(line.receivedAmount)}
      </td>
      <td className="p-1 text-right text-sm tabular-nums font-medium">
        {isNegative ? (
          <span className="text-destructive">₹{fmtINR(Math.abs(line.pendingAmount))}</span>
        ) : (
          <span>₹{fmtINR(line.pendingAmount)}</span>
        )}
      </td>
      <td className="p-1">
        <Badge className={
          isNegative
            ? "bg-red-100 text-red-800"
            : isZero
            ? "bg-gray-100 text-gray-800"
            : STATUS_COLORS[line.status] || "bg-gray-100 text-gray-800"
        }>
          {isNegative ? "Expected Deduction" : isZero ? "Settled" : line.status}
        </Badge>
      </td>
      <td className="p-1 text-sm">{line.paymentMethod}</td>
      <td className="p-1 text-sm font-mono">{line.paymentReference}</td>
      <td className="p-1 text-sm tabular-nums">{line.receivedDate}</td>
      <td className="p-1 text-sm text-muted-foreground">{line.notes}</td>
    </tr>
  );
}

export const PaymentRow = memo(PaymentRowBase);