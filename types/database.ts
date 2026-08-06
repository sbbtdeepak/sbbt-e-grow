/**
 * SBBT E-Grow — Supabase Database Types
 *
 * Multi-tenant SaaS schema for the Live Plant E-commerce ERP.
 * Every tenant-scoped table carries the standard audit/multitenancy fields:
 *   id, company_id, created_at, updated_at, created_by
 *
 * Future modules must be added as new tables only — never alter existing ones.
 * This file mirrors supabase/migrations/0001_initial_schema.sql.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Standard audit/multitenancy columns shared by every tenant-scoped table. */
export type BaseEntity = {
  id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

/** App-level user roles. */
export type UserRole = "master_admin" | "company_admin" | "staff";

/** Order lifecycle stages. */
export type OrderStage = "entry" | "purchase" | "packing" | "dispatch" | "delivery";

/** Payment status for a settled/expected payment. */
export type PaymentStatus = "expected" | "received" | "partial" | "pending" | "cancelled";

/** Product status. */
export type ProductStatus = "active" | "inactive";

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          is_active: boolean;
          logo_url: string | null;
          gst: string | null;
          address: string | null;
          timezone: string;
          currency: string;
          financial_year_start: string | null;
          theme: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          is_active?: boolean;
          logo_url?: string | null;
          gst?: string | null;
          address?: string | null;
          timezone?: string;
          currency?: string;
          financial_year_start?: string | null;
          theme?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          is_active?: boolean;
          logo_url?: string | null;
          gst?: string | null;
          address?: string | null;
          timezone?: string;
          currency?: string;
          financial_year_start?: string | null;
          theme?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          full_name: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id?: string | null;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };

      marketplaces: {
        Row: BaseEntity & {
          name: string;
          slug: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          slug: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          slug?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "marketplaces_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };

      seller_accounts: {
        Row: BaseEntity & {
          marketplace_id: string;
          name: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          company_id: string;
          marketplace_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          marketplace_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "seller_accounts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_accounts_marketplace_id_fkey";
            columns: ["marketplace_id"];
            isOneToOne: false;
            referencedRelation: "marketplaces";
            referencedColumns: ["id"];
          },
        ];
      };

      products: {
        Row: BaseEntity & {
          sku: string;
          name: string;
          buying_price: number;
          category: string | null;
          image_url: string | null;
          status: ProductStatus;
        };
        Insert: {
          id?: string;
          company_id: string;
          sku: string;
          name: string;
          buying_price: number;
          category?: string | null;
          image_url?: string | null;
          status?: ProductStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          sku?: string;
          name?: string;
          buying_price?: number;
          category?: string | null;
          image_url?: string | null;
          status?: ProductStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };

      orders: {
        Row: BaseEntity & {
          order_date: string;
          marketplace_id: string;
          seller_account_id: string;
          stage: OrderStage;
          notes: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          order_date?: string;
          marketplace_id: string;
          seller_account_id: string;
          stage?: OrderStage;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          order_date?: string;
          marketplace_id?: string;
          seller_account_id?: string;
          stage?: OrderStage;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_marketplace_id_fkey";
            columns: ["marketplace_id"];
            isOneToOne: false;
            referencedRelation: "marketplaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_seller_account_id_fkey";
            columns: ["seller_account_id"];
            isOneToOne: false;
            referencedRelation: "seller_accounts";
            referencedColumns: ["id"];
          },
        ];
      };

      order_items: {
        Row: BaseEntity & {
          order_id: string;
          product_id: string;
          ordered_qty: number;
          buy_qty: number;
          packed_qty: number;
          delivered_qty: number;
          selling_price: number;
          buying_price: number;
          total_sale: number;
          total_purchase: number;
          profit: number;
          vendor_notes: string | null;
          packaging_notes: string | null;
          packaging_date: string | null;
          dispatch_qty: number;
          dispatch_date: string | null;
          dispatch_notes: string | null;
          tracking_number: string | null;
          courier_name: string | null;
          delivery_date: string | null;
          delivery_notes: string | null;
          delivery_status: string | null;
          delivery_reference: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          order_id: string;
          product_id: string;
          ordered_qty: number;
          buy_qty?: number;
          packed_qty?: number;
          delivered_qty?: number;
          selling_price: number;
          buying_price: number;
          vendor_notes?: string | null;
          packaging_notes?: string | null;
          packaging_date?: string | null;
          dispatch_qty?: number;
          dispatch_date?: string | null;
          dispatch_notes?: string | null;
          tracking_number?: string | null;
          courier_name?: string | null;
          delivery_date?: string | null;
          delivery_notes?: string | null;
          delivery_status?: string | null;
          delivery_reference?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          order_id?: string;
          product_id?: string;
          ordered_qty?: number;
          buy_qty?: number;
          packed_qty?: number;
          delivered_qty?: number;
          selling_price?: number;
          buying_price?: number;
          vendor_notes?: string | null;
          packaging_notes?: string | null;
          packaging_date?: string | null;
          dispatch_qty?: number;
          dispatch_date?: string | null;
          dispatch_notes?: string | null;
          tracking_number?: string | null;
          courier_name?: string | null;
          delivery_date?: string | null;
          delivery_notes?: string | null;
          delivery_status?: string | null;
          delivery_reference?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };

      payments: {
        Row: BaseEntity & {
          order_id: string;
          delivery_date: string | null;
          expected_payment_date: string | null;
          amount_expected: number;
          amount_received: number;
          pending: number;
          status: PaymentStatus;
          payment_method: string | null;
          payment_reference: string | null;
          payment_notes: string | null;
          payment_received_date: string | null;
          payment_release_days: number;
        };
        Insert: {
          id?: string;
          company_id: string;
          order_id: string;
          delivery_date?: string | null;
          expected_payment_date?: string | null;
          amount_expected: number;
          amount_received?: number;
          pending?: number;
          status?: PaymentStatus;
          payment_method?: string | null;
          payment_reference?: string | null;
          payment_notes?: string | null;
          payment_received_date?: string | null;
          payment_release_days?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          order_id?: string;
          delivery_date?: string | null;
          expected_payment_date?: string | null;
          amount_expected?: number;
          amount_received?: number;
          pending?: number;
          status?: PaymentStatus;
          payment_method?: string | null;
          payment_reference?: string | null;
          payment_notes?: string | null;
          payment_received_date?: string | null;
          payment_release_days?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };

      settings: {
        Row: BaseEntity & {
          key: string;
          value: Json;
        };
        Insert: {
          id?: string;
          company_id: string;
          key: string;
          value: Json;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          key?: string;
          value?: Json;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };

      company_settings: {
        Row: {
          id: string;
          company_id: string;
          key: string;
          value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          key: string;
          value?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          key?: string;
          value?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };

    Views: {
      report_daily_sales: {
        Row: {
          company_id: string;
          report_date: string;
          total_orders: number;
          total_sales: number;
          total_purchase: number;
          total_profit: number;
          total_qty: number;
        };
        Relationships: [];
      };
      report_daily_purchase: {
        Row: {
          company_id: string;
          report_date: string;
          total_orders: number;
          total_purchase: number;
          total_qty: number;
        };
        Relationships: [];
      };
      report_daily_profit: {
        Row: {
          company_id: string;
          report_date: string;
          total_profit: number;
          total_sales: number;
          total_purchase: number;
        };
        Relationships: [];
      };
      report_marketplace: {
        Row: {
          company_id: string;
          marketplace_id: string;
          marketplace_name: string;
          total_orders: number;
          total_sales: number;
          total_profit: number;
          total_delivered: number;
          cancelled_qty: number;
          returned_qty: number;
          rto_qty: number;
        };
        Relationships: [];
      };
      report_seller: {
        Row: {
          company_id: string;
          seller_account_id: string;
          seller_name: string;
          marketplace_id: string;
          marketplace_name: string;
          total_orders: number;
          total_sales: number;
          total_profit: number;
          total_delivered: number;
        };
        Relationships: [];
      };
      report_product: {
        Row: {
          company_id: string;
          product_id: string;
          sku: string;
          product_name: string;
          total_orders: number;
          total_ordered: number;
          total_buy: number;
          total_packed: number;
          total_dispatched: number;
          total_delivered: number;
          total_sales: number;
          total_profit: number;
        };
        Relationships: [];
      };
      report_pending_payments: {
        Row: {
          company_id: string;
          payment_id: string;
          order_id: string;
          order_date: string;
          marketplace: string;
          seller: string;
          amount_expected: number;
          amount_received: number;
          pending: number;
          status: string;
          expected_payment_date: string;
          delivery_date: string;
        };
        Relationships: [];
      };
      report_received_payments: {
        Row: {
          company_id: string;
          payment_id: string;
          order_id: string;
          order_date: string;
          marketplace: string;
          seller: string;
          amount_expected: number;
          amount_received: number;
          pending: number;
          status: string;
          payment_received_date: string;
          payment_method: string;
          payment_reference: string;
        };
        Relationships: [];
      };
      report_cancelled_orders: {
        Row: {
          company_id: string;
          order_id: string;
          order_date: string;
          marketplace: string;
          seller: string;
          product_id: string;
          sku: string;
          product_name: string;
          ordered_qty: number;
          delivered_qty: number;
          delivery_status: string;
          delivery_notes: string;
        };
        Relationships: [];
      };
      report_rto: {
        Row: {
          company_id: string;
          order_id: string;
          order_date: string;
          marketplace: string;
          seller: string;
          product_id: string;
          sku: string;
          product_name: string;
          ordered_qty: number;
          delivered_qty: number;
          delivery_notes: string;
        };
        Relationships: [];
      };
      report_top_selling_products: {
        Row: {
          company_id: string;
          product_id: string;
          sku: string;
          product_name: string;
          total_orders: number;
          total_delivered: number;
          total_sales: number;
          total_profit: number;
        };
        Relationships: [];
      };
      report_top_sellers: {
        Row: {
          company_id: string;
          seller_account_id: string;
          seller_name: string;
          marketplace_id: string;
          marketplace_name: string;
          total_orders: number;
          total_delivered: number;
          total_sales: number;
          total_profit: number;
        };
        Relationships: [];
      };
    };

    Functions: {
      [_ in never]: never;
    };

    Enums: {
      user_role: UserRole;
      order_stage: OrderStage;
      payment_status: PaymentStatus;
      product_status: ProductStatus;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];