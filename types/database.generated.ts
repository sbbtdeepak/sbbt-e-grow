export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          financial_year_start: string | null
          gst: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          financial_year_start?: string | null
          gst?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          financial_year_start?: string | null
          gst?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplaces: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplaces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          buy_qty: number
          buying_price: number
          company_id: string
          courier_name: string | null
          created_at: string
          created_by: string | null
          delivered_qty: number
          delivery_date: string | null
          delivery_notes: string | null
          delivery_reference: string | null
          delivery_status: string | null
          dispatch_date: string | null
          dispatch_notes: string | null
          dispatch_qty: number
          id: string
          order_id: string
          ordered_qty: number
          packaging_date: string | null
          packaging_notes: string | null
          packed_qty: number
          product_id: string
          profit: number | null
          selling_price: number
          total_purchase: number | null
          total_sale: number | null
          tracking_number: string | null
          updated_at: string
          vendor_notes: string | null
        }
        Insert: {
          buy_qty?: number
          buying_price: number
          company_id: string
          courier_name?: string | null
          created_at?: string
          created_by?: string | null
          delivered_qty?: number
          delivery_date?: string | null
          delivery_notes?: string | null
          delivery_reference?: string | null
          delivery_status?: string | null
          dispatch_date?: string | null
          dispatch_notes?: string | null
          dispatch_qty?: number
          id?: string
          order_id: string
          ordered_qty: number
          packaging_date?: string | null
          packaging_notes?: string | null
          packed_qty?: number
          product_id: string
          profit?: number | null
          selling_price: number
          total_purchase?: number | null
          total_sale?: number | null
          tracking_number?: string | null
          updated_at?: string
          vendor_notes?: string | null
        }
        Update: {
          buy_qty?: number
          buying_price?: number
          company_id?: string
          courier_name?: string | null
          created_at?: string
          created_by?: string | null
          delivered_qty?: number
          delivery_date?: string | null
          delivery_notes?: string | null
          delivery_reference?: string | null
          delivery_status?: string | null
          dispatch_date?: string | null
          dispatch_notes?: string | null
          dispatch_qty?: number
          id?: string
          order_id?: string
          ordered_qty?: number
          packaging_date?: string | null
          packaging_notes?: string | null
          packed_qty?: number
          product_id?: string
          profit?: number | null
          selling_price?: number
          total_purchase?: number | null
          total_sale?: number | null
          tracking_number?: string | null
          updated_at?: string
          vendor_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "report_cancelled_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "report_rto"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "report_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "report_top_selling_products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      orders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          marketplace_id: string
          notes: string | null
          order_date: string
          seller_account_id: string
          stage: Database["public"]["Enums"]["order_stage"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          marketplace_id: string
          notes?: string | null
          order_date?: string
          seller_account_id: string
          stage?: Database["public"]["Enums"]["order_stage"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          marketplace_id?: string
          notes?: string | null
          order_date?: string
          seller_account_id?: string
          stage?: Database["public"]["Enums"]["order_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "report_marketplace"
            referencedColumns: ["marketplace_id"]
          },
          {
            foreignKeyName: "orders_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "report_seller"
            referencedColumns: ["marketplace_id"]
          },
          {
            foreignKeyName: "orders_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "report_top_sellers"
            referencedColumns: ["marketplace_id"]
          },
          {
            foreignKeyName: "orders_seller_account_id_fkey"
            columns: ["seller_account_id"]
            isOneToOne: false
            referencedRelation: "report_seller"
            referencedColumns: ["seller_account_id"]
          },
          {
            foreignKeyName: "orders_seller_account_id_fkey"
            columns: ["seller_account_id"]
            isOneToOne: false
            referencedRelation: "report_top_sellers"
            referencedColumns: ["seller_account_id"]
          },
          {
            foreignKeyName: "orders_seller_account_id_fkey"
            columns: ["seller_account_id"]
            isOneToOne: false
            referencedRelation: "seller_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_expected: number
          amount_received: number
          company_id: string
          created_at: string
          created_by: string | null
          delivery_date: string | null
          expected_payment_date: string | null
          id: string
          order_id: string
          payment_method: string | null
          payment_notes: string | null
          payment_received_date: string | null
          payment_reference: string | null
          payment_release_days: number
          pending: number | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_expected: number
          amount_received?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          expected_payment_date?: string | null
          id?: string
          order_id: string
          payment_method?: string | null
          payment_notes?: string | null
          payment_received_date?: string | null
          payment_reference?: string | null
          payment_release_days?: number
          pending?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_expected?: number
          amount_received?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          expected_payment_date?: string | null
          id?: string
          order_id?: string
          payment_method?: string | null
          payment_notes?: string | null
          payment_received_date?: string | null
          payment_reference?: string | null
          payment_release_days?: number
          pending?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "report_cancelled_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "report_rto"
            referencedColumns: ["order_id"]
          },
        ]
      }
      products: {
        Row: {
          buying_price: number
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          name: string
          sku: string
          status: Database["public"]["Enums"]["product_status"]
          updated_at: string
        }
        Insert: {
          buying_price: number
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          name: string
          sku: string
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Update: {
          buying_price?: number
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sku?: string
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_accounts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          marketplace_id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          marketplace_id: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          marketplace_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_accounts_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_accounts_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "report_marketplace"
            referencedColumns: ["marketplace_id"]
          },
          {
            foreignKeyName: "seller_accounts_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "report_seller"
            referencedColumns: ["marketplace_id"]
          },
          {
            foreignKeyName: "seller_accounts_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "report_top_sellers"
            referencedColumns: ["marketplace_id"]
          },
        ]
      }
      settings: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      report_cancelled_orders: {
        Row: {
          company_id: string | null
          delivered_qty: number | null
          delivery_notes: string | null
          delivery_status: string | null
          marketplace: string | null
          order_date: string | null
          order_id: string | null
          ordered_qty: number | null
          product_id: string | null
          product_name: string | null
          seller: string | null
          sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "report_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "report_top_selling_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_daily_profit: {
        Row: {
          company_id: string | null
          report_date: string | null
          total_profit: number | null
          total_purchase: number | null
          total_sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_daily_purchase: {
        Row: {
          company_id: string | null
          report_date: string | null
          total_orders: number | null
          total_purchase: number | null
          total_qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_daily_sales: {
        Row: {
          company_id: string | null
          report_date: string | null
          total_orders: number | null
          total_profit: number | null
          total_purchase: number | null
          total_qty: number | null
          total_sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_marketplace: {
        Row: {
          cancelled_qty: number | null
          company_id: string | null
          marketplace_id: string | null
          marketplace_name: string | null
          returned_qty: number | null
          rto_qty: number | null
          total_delivered: number | null
          total_orders: number | null
          total_profit: number | null
          total_sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_pending_payments: {
        Row: {
          amount_expected: number | null
          amount_received: number | null
          company_id: string | null
          delivery_date: string | null
          expected_payment_date: string | null
          marketplace: string | null
          order_date: string | null
          order_id: string | null
          payment_id: string | null
          pending: number | null
          seller: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "report_cancelled_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "report_rto"
            referencedColumns: ["order_id"]
          },
        ]
      }
      report_product: {
        Row: {
          company_id: string | null
          product_id: string | null
          product_name: string | null
          sku: string | null
          total_buy: number | null
          total_delivered: number | null
          total_dispatched: number | null
          total_ordered: number | null
          total_orders: number | null
          total_packed: number | null
          total_profit: number | null
          total_sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_received_payments: {
        Row: {
          amount_expected: number | null
          amount_received: number | null
          company_id: string | null
          marketplace: string | null
          order_date: string | null
          order_id: string | null
          payment_id: string | null
          payment_method: string | null
          payment_received_date: string | null
          payment_reference: string | null
          pending: number | null
          seller: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "report_cancelled_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "report_rto"
            referencedColumns: ["order_id"]
          },
        ]
      }
      report_rto: {
        Row: {
          company_id: string | null
          delivered_qty: number | null
          delivery_notes: string | null
          marketplace: string | null
          order_date: string | null
          order_id: string | null
          ordered_qty: number | null
          product_id: string | null
          product_name: string | null
          seller: string | null
          sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "report_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "report_top_selling_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_seller: {
        Row: {
          company_id: string | null
          marketplace_id: string | null
          marketplace_name: string | null
          seller_account_id: string | null
          seller_name: string | null
          total_delivered: number | null
          total_orders: number | null
          total_profit: number | null
          total_sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_top_sellers: {
        Row: {
          company_id: string | null
          marketplace_id: string | null
          marketplace_name: string | null
          seller_account_id: string | null
          seller_name: string | null
          total_delivered: number | null
          total_orders: number | null
          total_profit: number | null
          total_sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_top_selling_products: {
        Row: {
          company_id: string | null
          product_id: string | null
          product_name: string | null
          sku: string | null
          total_delivered: number | null
          total_orders: number | null
          total_profit: number | null
          total_sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_profile_company: {
        Args: { p_company_id: string; p_profile_id: string }
        Returns: undefined
      }
      current_company_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_master_admin: { Args: never; Returns: boolean }
      set_profile_role: {
        Args: {
          p_profile_id: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: undefined
      }
      update_my_profile: { Args: { p_full_name: string }; Returns: undefined }
    }
    Enums: {
      order_stage: "entry" | "purchase" | "packing" | "delivery" | "dispatch"
      payment_status:
        | "expected"
        | "partial"
        | "received"
        | "pending"
        | "cancelled"
      product_status: "active" | "inactive"
      user_role: "master_admin" | "company_admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      order_stage: ["entry", "purchase", "packing", "delivery", "dispatch"],
      payment_status: [
        "expected",
        "partial",
        "received",
        "pending",
        "cancelled",
      ],
      product_status: ["active", "inactive"],
      user_role: ["master_admin", "company_admin", "staff"],
    },
  },
} as const
