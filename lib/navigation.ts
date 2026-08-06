import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Store,
  ShoppingCart,
  Truck,
  PackageCheck,
  Send,
  Home,
  CreditCard,
  BarChart3,
  Settings,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

/**
 * Primary app navigation.
 *
 * Single source of truth for sidebar + mobile nav.
 * Add new modules here — never hardcode nav in components.
 */
export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview of orders, payments and profit.",
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
    description: "Product master with SKU and buying price.",
  },
  {
    title: "Marketplaces",
    href: "/marketplaces",
    icon: Store,
    description: "Marketplaces and seller accounts.",
  },
  {
    title: "Orders",
    href: "/orders",
    icon: ShoppingCart,
    description: "Order entry through delivery flow.",
  },
  {
    title: "Purchase",
    href: "/purchase",
    icon: Truck,
    description: "Confirm purchases and manage vendor notes.",
  },
  {
    title: "Packing",
    href: "/packing",
    icon: PackageCheck,
    description: "Pack confirmed purchases. Prepares for dispatch.",
  },
  {
    title: "Dispatch",
    href: "/dispatch",
    icon: Send,
    description: "Dispatch packed parcels to couriers.",
  },
  {
    title: "Delivery",
    href: "/delivery",
    icon: Home,
    description: "Confirm delivery status and track parcels.",
  },
  {
    title: "Payments",
    href: "/payments",
    icon: CreditCard,
    description: "Expected payments, receive and track.",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Seller-wise performance and profit reports.",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Company settings and preferences.",
  },
];