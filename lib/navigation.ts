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
  Building2,
  Gem,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  permission: string | null;
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
    permission: null,
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
    description: "Product master with SKU and buying price.",
    permission: "products",
  },
  {
    title: "Marketplaces",
    href: "/marketplaces",
    icon: Store,
    description: "Marketplaces and seller accounts.",
    permission: "marketplaces",
  },
  {
    title: "Orders",
    href: "/orders",
    icon: ShoppingCart,
    description: "Order entry through delivery flow.",
    permission: "orders",
  },
  {
    title: "Purchase",
    href: "/purchase",
    icon: Truck,
    description: "Confirm purchases and manage vendor notes.",
    permission: "purchase",
  },
  {
    title: "Packing",
    href: "/packing",
    icon: PackageCheck,
    description: "Pack confirmed purchases. Prepares for dispatch.",
    permission: "packing",
  },
  {
    title: "Dispatch",
    href: "/dispatch",
    icon: Send,
    description: "Dispatch packed parcels to couriers.",
    permission: "dispatch",
  },
  {
    title: "Delivery",
    href: "/delivery",
    icon: Home,
    description: "Confirm delivery status and track parcels.",
    permission: "delivery",
  },
  {
    title: "Payments",
    href: "/payments",
    icon: CreditCard,
    description: "Expected payments, receive and track.",
    permission: "payments",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Seller-wise performance and profit reports.",
    permission: "reports",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Company settings and preferences.",
    permission: null,
  },
];

/**
 * Master Admin navigation (SaaS control plane).
 *
 * Separate from the ERP navItems on purpose: master admins manage SaaS
 * tenants, plans, and the public catalogue — never company-scoped ERP
 * routes (which require a company session).
 */
export const masterNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/master",
    icon: LayoutDashboard,
    description: "SaaS control center overview.",
    permission: null,
  },
  {
    title: "Companies",
    href: "/master/companies",
    icon: Building2,
    description: "Manage SaaS tenants and subscriptions.",
    permission: null,
  },
  {
    title: "Plans",
    href: "/master/plans",
    icon: Gem,
    description: "Subscription plans and feature limits.",
    permission: null,
  },
  {
    title: "Products",
    href: "/master/products",
    icon: Package,
    description: "Public SaaS product catalogue.",
    permission: null,
  },
  {
    title: "Settings",
    href: "/master/settings",
    icon: Settings,
    description: "Master Admin account.",
    permission: null,
  },
];