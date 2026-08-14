"use server";

import {
  getFeatureLimit,
  getUsage,
  assertFeatureAccess,
} from "@/lib/saas/entitlements";

export type UsageStat = {
  key: string;
  limit: number | null;
  usage: number;
};

const LIMIT_KEYS = [
  "products_limit",
  "marketplaces_limit",
  "seller_accounts_limit",
  "monthly_orders_limit",
];

/**
 * Return usage stat for a specific limit key.
 * Master Admin always shows usage against Infinity limit.
 */
export async function getUsageStat(limitKey: string): Promise<UsageStat> {
  const [limit, usage] = await Promise.all([
    getFeatureLimit(limitKey),
    getUsage(limitKey),
  ]);

  return { key: limitKey, limit, usage };
}

/**
 * Return usage stats for all core limits.
 * Suitable for dashboard / limit indicator display.
 */
export async function getUsageStats(): Promise<UsageStat[]> {
  return Promise.all(LIMIT_KEYS.map((k) => getUsageStat(k)));
}

/**
 * Return whether a boolean feature is enabled for the current company.
 */
export async function checkFeature(featureKey: string): Promise<boolean> {
  try {
    await assertFeatureAccess(featureKey);
    return true;
  } catch {
    return false;
  }
}
