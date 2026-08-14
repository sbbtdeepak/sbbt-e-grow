import type { LucideIcon } from "lucide-react";
import {
ShoppingCart,
Truck,
PackageCheck,
Send,
Home,
CreditCard,
MoreHorizontal,
} from "lucide-react";

export type MarketplaceTabKey =
| "all"
| "amazon"
| "meesho"
| "flipkart"
| "other";

export type MarketplaceTab = {
key: MarketplaceTabKey;
label: string;
};

/**
 * Fixed marketplace filter tabs shown in the mobile Staff UI top bar.
 */
export const marketplaceTabs: MarketplaceTab[] = [
{ key: "all", label: "All" },
{ key: "amazon", label: "Amazon" },
{ key: "meesho", label: "Meesho" },
{ key: "flipkart", label: "Flipkart" },
{ key: "other", label: "Other" },
];

export type StaffNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: string | null;
};

/**
 * Bottom fixed navigation for the mobile Staff UI.
 * Single source of truth — same items rendered as icons in bottom bar.
 * Items with a `permission` are filtered on the client based on the
 * staff member's permission set. `permission: null` means always visible.
 */
export const staffNavItems: StaffNavItem[] = [
  { title: "Order", href: "/orders", icon: ShoppingCart, permission: "orders" },
  { title: "Purchase", href: "/purchase", icon: Truck, permission: "purchase" },
  { title: "Packing", href: "/packing", icon: PackageCheck, permission: "packing" },
  { title: "Dispatch", href: "/dispatch", icon: Send, permission: "dispatch" },
  { title: "Delivery", href: "/delivery", icon: Home, permission: "delivery" },
  { title: "Payment", href: "/payments", icon: CreditCard, permission: "payments" },
  { title: "More", href: "#more", icon: MoreHorizontal, permission: null },
];

export type NormalizedMarketplaceKey =
| "amazon"
| "meesho"
| "flipkart"
| "other";

/**
 * Maps a real marketplace name (e.g. "Amazon", "Meesho", "Website")
 * to a fixed Staff UI tab key. Anything not matching the three
 * known marketplaces falls under "other".
 */
export function normalizeMarketplaceKey(
name: string,
): NormalizedMarketplaceKey {
const normalized = name.toLowerCase();
if (normalized.includes("amazon")) return "amazon";
if (normalized.includes("meesho")) return "meesho";
if (normalized.includes("flipkart")) return "flipkart";
return "other";
}

export function matchesMarketplaceFilter(
  marketplaceName: string,
  filter: MarketplaceTabKey,
): boolean {
  if (filter === "all") return true;
  return normalizeMarketplaceKey(marketplaceName) === filter;
}

/**
 * Parses an unknown URL query value into a valid marketplace tab key.
 * Any missing or invalid value falls back to "all".
 */
export function parseMarketplaceFilter(
  value: unknown,
): MarketplaceTabKey {
  if (
    typeof value === "string" &&
    marketplaceTabs.some((tab) => tab.key === value)
  ) {
    return value as MarketplaceTabKey;
  }
  return "all";
}
