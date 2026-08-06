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

function PaymentRowBase({ line, onToggle }: PaymentRowProps) {
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
      <td className="p-1 text-right text-sm tabular-nums">{line.expectedAmount.toFixed(2)}</td>
      <td className="p-1 text-right text-sm tabular-nums">{line.receivedAmount.toFixed(2)}</td>
      <td className="p-1 text-right text-sm tabular-nums font-medium">{line.pendingAmount.toFixed(2)}</td>
      <td className="p-1">
        <Badge className={STATUS_COLORS[line.status] || "bg-gray-100 text-gray-800"}>
          {line.status}
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