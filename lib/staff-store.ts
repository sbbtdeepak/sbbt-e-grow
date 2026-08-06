import { create } from "zustand";
import type { MarketplaceTabKey } from "@/lib/staff-navigation";

type StaffStore = {
  marketplaceFilter: MarketplaceTabKey;
  setMarketplaceFilter: (filter: MarketplaceTabKey) => void;
};

/**
 * Client-side marketplace filter shared between the mobile
 * Staff UI top bar (in layout) and module views (in pages).
 *
 * Kept in a global store so the filter survives route changes
 * without server round-trips — fast and offline-friendly.
 */
export const useStaffStore = create<StaffStore>((set) => ({
  marketplaceFilter: "all",
  setMarketplaceFilter: (marketplaceFilter) => set({ marketplaceFilter }),
}));