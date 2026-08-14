import { z } from "zod";

export const companyIdSchema = z.object({
  companyId: z.string().uuid("Invalid company ID."),
});

export const planIdSchema = z.object({
  planId: z.string().uuid("Invalid plan ID."),
});

export const subscriptionStatusSchema = z.object({
  status: z.enum(["trialing", "active", "past_due", "cancelled", "expired"]),
});

export const trialDurationSchema = z.object({
  days: z.number().int().min(1, "Trial must be at least 1 day.").max(730, "Trial cannot exceed 730 days."),
});

export const periodSchema = z
  .object({
    periodStart: z.string().min(1, "Period start is required."),
    periodEnd: z.string().min(1, "Period end is required."),
  })
  .refine((d) => new Date(d.periodEnd) >= new Date(d.periodStart), {
    message: "Period end must be after or equal to period start.",
    path: ["periodEnd"],
  });

export const cancelSubscriptionSchema = z.object({
  companyId: z.string().uuid(),
  reason: z.string().optional().nullable(),
});

export const reactivateSchema = z.object({
  companyId: z.string().uuid(),
  planId: z.string().uuid("Plan selection is required."),
});

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";
