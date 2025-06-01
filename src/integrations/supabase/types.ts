export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customer_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          customer_id: string | null
          description: string
          id: string
          restaurant_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          customer_id?: string | null
          description: string
          id?: string
          restaurant_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          customer_id?: string | null
          description?: string
          id?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          customer_id: string | null
          id: string
          restaurant_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          customer_id?: string | null
          id?: string
          restaurant_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          customer_id?: string | null
          id?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          average_order_value: number
          birthday: string | null
          created_at: string
          email: string | null
          id: string
          last_visit_date: string | null
          loyalty_enrolled: boolean | null
          loyalty_points: number
          loyalty_points_last_updated: string | null
          loyalty_tier_id: string | null
          name: string
          phone: string | null
          preferences: string | null
          restaurant_id: string
          tags: string[]
          total_spent: number
          visit_count: number
        }
        Insert: {
          address?: string | null
          average_order_value?: number
          birthday?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_visit_date?: string | null
          loyalty_enrolled?: boolean | null
          loyalty_points?: number
          loyalty_points_last_updated?: string | null
          loyalty_tier_id?: string | null
          name: string
          phone?: string | null
          preferences?: string | null
          restaurant_id: string
          tags?: string[]
          total_spent?: number
          visit_count?: number
        }
        Update: {
          address?: string | null
          average_order_value?: number
          birthday?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_visit_date?: string | null
          loyalty_enrolled?: boolean | null
          loyalty_points?: number
          loyalty_points_last_updated?: string | null
          loyalty_tier_id?: string | null
          name?: string
          phone?: string | null
          preferences?: string | null
          restaurant_id?: string
          tags?: string[]
          total_spent?: number
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "customers_loyalty_tier_id_fkey"
            columns: ["loyalty_tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_revenue_stats: {
        Row: {
          average_order_value: number
          created_at: string
          date: string
          id: string
          order_count: number
          restaurant_id: string
          total_revenue: number
          updated_at: string
        }
        Insert: {
          average_order_value?: number
          created_at?: string
          date: string
          id?: string
          order_count?: number
          restaurant_id: string
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          average_order_value?: number
          created_at?: string
          date?: string
          id?: string
          order_count?: number
          restaurant_id?: string
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_revenue_stats_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          budget_limit: number | null
          color_code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          budget_limit?: number | null
          color_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          budget_limit?: number | null
          color_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          is_recurring: boolean | null
          payment_method: string | null
          receipt_url: string | null
          recurring_frequency: string | null
          restaurant_id: string
          status: string | null
          subcategory: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          payment_method?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          restaurant_id: string
          status?: string | null
          subcategory?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          payment_method?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          restaurant_id?: string
          status?: string | null
          subcategory?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      inventory_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          id: string
          inventory_item_id: string
          is_read: boolean | null
          message: string
          restaurant_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          id?: string
          inventory_item_id: string
          is_read?: boolean | null
          message: string
          restaurant_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          inventory_item_id?: string
          is_read?: boolean | null
          message?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          cost_per_unit: number | null
          created_at: string
          id: string
          name: string
          notification_sent: boolean | null
          quantity: number
          reorder_level: number | null
          restaurant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          name: string
          notification_sent?: boolean | null
          quantity?: number
          reorder_level?: number | null
          restaurant_id: string
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          name?: string
          notification_sent?: boolean | null
          quantity?: number
          reorder_level?: number | null
          restaurant_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          restaurant_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_orders: {
        Row: {
          created_at: string
          id: string
          items: Json
          order_id: string | null
          restaurant_id: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items: Json
          order_id?: string | null
          restaurant_id?: string | null
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          order_id?: string | null
          restaurant_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          amount_per_point: number
          created_at: string
          id: string
          is_enabled: boolean | null
          points_expiry_days: number | null
          points_per_amount: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          amount_per_point?: number
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          points_expiry_days?: number | null
          points_per_amount?: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          amount_per_point?: number
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          points_expiry_days?: number | null
          points_per_amount?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_redemptions: {
        Row: {
          created_at: string
          customer_id: string
          discount_applied: number
          id: string
          order_id: string
          points_used: number
          restaurant_id: string
          reward_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          discount_applied: number
          id?: string
          order_id: string
          points_used: number
          restaurant_id: string
          reward_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          discount_applied?: number
          id?: string
          order_id?: string
          points_used?: number
          restaurant_id?: string
          reward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_required: number
          restaurant_id: string
          reward_type: string
          reward_value: number
          tier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_required: number
          restaurant_id: string
          reward_type: string
          reward_value: number
          tier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number
          restaurant_id?: string
          reward_type?: string
          reward_value?: number
          tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          benefits: Json | null
          created_at: string
          display_order: number
          id: string
          name: string
          points_required: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          benefits?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          name: string
          points_required: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          benefits?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          points_required?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_tiers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          points: number
          restaurant_id: string
          source: string
          source_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          points: number
          restaurant_id: string
          source: string
          source_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          points?: number
          restaurant_id?: string
          source?: string
          source_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_special: boolean | null
          is_veg: boolean | null
          name: string
          price: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_special?: boolean | null
          is_veg?: boolean | null
          name: string
          price: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_special?: boolean | null
          is_veg?: boolean | null
          name?: string
          price?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budgets: {
        Row: {
          actual_amount: number | null
          budgeted_amount: number
          category: string
          created_at: string
          id: string
          month: number
          restaurant_id: string
          updated_at: string
          year: number
        }
        Insert: {
          actual_amount?: number | null
          budgeted_amount: number
          category: string
          created_at?: string
          id?: string
          month: number
          restaurant_id: string
          updated_at?: string
          year: number
        }
        Update: {
          actual_amount?: number | null
          budgeted_amount?: number
          category?: string
          created_at?: string
          id?: string
          month?: number
          restaurant_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_recipients: string[] | null
          id: string
          notify_low_stock: boolean | null
          notify_new_orders: boolean | null
          notify_staff_leaves: boolean | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_recipients?: string[] | null
          id?: string
          notify_low_stock?: boolean | null
          notify_new_orders?: boolean | null
          notify_staff_leaves?: boolean | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_recipients?: string[] | null
          id?: string
          notify_low_stock?: boolean | null
          notify_new_orders?: boolean | null
          notify_staff_leaves?: boolean | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          items: string[]
          restaurant_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          items: string[]
          restaurant_id: string
          status?: string
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          items?: string[]
          restaurant_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          restaurant_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          restaurant_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          restaurant_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_campaigns: {
        Row: {
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          potential_increase: string | null
          promotion_code: string | null
          restaurant_id: string
          start_date: string
          status: string | null
          time_period: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          potential_increase?: string | null
          promotion_code?: string | null
          restaurant_id: string
          start_date: string
          status?: string | null
          time_period?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          potential_increase?: string | null
          promotion_code?: string | null
          restaurant_id?: string
          start_date?: string
          status?: string | null
          time_period?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number
          total_cost: number
          unit_cost: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          delivery_date: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          restaurant_id: string
          status: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          restaurant_id: string
          status?: string
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          restaurant_id?: string
          status?: string
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          end_time: string
          id: string
          marketing_consent: boolean | null
          notes: string | null
          restaurant_id: string
          room_id: string
          special_occasion: string | null
          special_occasion_date: string | null
          start_time: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          end_time: string
          id?: string
          marketing_consent?: boolean | null
          notes?: string | null
          restaurant_id: string
          room_id: string
          special_occasion?: string | null
          special_occasion_date?: string | null
          start_time: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_time?: string
          id?: string
          marketing_consent?: boolean | null
          notes?: string | null
          restaurant_id?: string
          room_id?: string
          special_occasion?: string | null
          special_occasion_date?: string | null
          start_time?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_operating_hours: {
        Row: {
          closing_time: string
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          opening_time: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          closing_time: string
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          opening_time: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          closing_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          opening_time?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          restaurant_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          plan_id: string
          restaurant_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          restaurant_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          name: string
          restaurant_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      room_billings: {
        Row: {
          additional_charges: Json
          checkout_date: string
          created_at: string
          customer_name: string
          days_stayed: number
          food_orders_ids: string[] | null
          food_orders_total: number | null
          id: string
          payment_method: string
          payment_status: string
          reservation_id: string
          restaurant_id: string
          room_charges: number
          room_id: string
          service_charge: number
          total_amount: number
          updated_at: string
          whatsapp_sent: boolean | null
        }
        Insert: {
          additional_charges?: Json
          checkout_date?: string
          created_at?: string
          customer_name: string
          days_stayed: number
          food_orders_ids?: string[] | null
          food_orders_total?: number | null
          id?: string
          payment_method: string
          payment_status?: string
          reservation_id: string
          restaurant_id: string
          room_charges: number
          room_id: string
          service_charge?: number
          total_amount: number
          updated_at?: string
          whatsapp_sent?: boolean | null
        }
        Update: {
          additional_charges?: Json
          checkout_date?: string
          created_at?: string
          customer_name?: string
          days_stayed?: number
          food_orders_ids?: string[] | null
          food_orders_total?: number | null
          id?: string
          payment_method?: string
          payment_status?: string
          reservation_id?: string
          restaurant_id?: string
          room_charges?: number
          room_id?: string
          service_charge?: number
          total_amount?: number
          updated_at?: string
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "room_billings_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_billings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_billings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_food_orders: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          items: Json
          restaurant_id: string
          room_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          items?: Json
          restaurant_id: string
          room_id: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          items?: Json
          restaurant_id?: string
          room_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_food_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_food_orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          id: string
          name: string
          price: number
          restaurant_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id?: string
          name: string
          price?: number
          restaurant_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          price?: number
          restaurant_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_promotions: {
        Row: {
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          promotion_id: string | null
          reservation_id: string | null
          restaurant_id: string
          sent_date: string
          sent_method: string
          sent_status: string
        }
        Insert: {
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          promotion_id?: string | null
          reservation_id?: string | null
          restaurant_id: string
          sent_date?: string
          sent_method?: string
          sent_status?: string
        }
        Update: {
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          promotion_id?: string | null
          reservation_id?: string | null
          restaurant_id?: string
          sent_date?: string
          sent_method?: string
          sent_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_promotions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_promotions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          availability_notes: string | null
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          photo_url: string | null
          position: string | null
          restaurant_id: string
          role_ids: string[] | null
          Shift: string | null
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          availability_notes?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          restaurant_id: string
          role_ids?: string[] | null
          Shift?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          availability_notes?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          restaurant_id?: string
          role_ids?: string[] | null
          Shift?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leave_balances: {
        Row: {
          created_at: string
          id: string
          leave_type: string
          restaurant_id: string
          staff_id: string
          total_days: number
          updated_at: string
          used_days: number
        }
        Insert: {
          created_at?: string
          id?: string
          leave_type: string
          restaurant_id: string
          staff_id: string
          total_days?: number
          updated_at?: string
          used_days?: number
        }
        Update: {
          created_at?: string
          id?: string
          leave_type?: string
          restaurant_id?: string
          staff_id?: string
          total_days?: number
          updated_at?: string
          used_days?: number
        }
        Relationships: []
      }
      staff_leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          manager_comments: string | null
          reason: string | null
          restaurant_id: string
          staff_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type: string
          manager_comments?: string | null
          reason?: string | null
          restaurant_id: string
          staff_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          manager_comments?: string | null
          reason?: string | null
          restaurant_id?: string
          staff_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_leave_types: {
        Row: {
          accrual_amount: number | null
          accrual_period: string | null
          accrual_type: string | null
          created_at: string
          id: string
          name: string
          requires_approval: boolean | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          accrual_amount?: number | null
          accrual_period?: string | null
          accrual_type?: string | null
          created_at?: string
          id?: string
          name: string
          requires_approval?: boolean | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          accrual_amount?: number | null
          accrual_period?: string | null
          accrual_type?: string | null
          created_at?: string
          id?: string
          name?: string
          requires_approval?: boolean | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_leaves: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          restaurant_id: string
          staff_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          restaurant_id: string
          staff_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          restaurant_id?: string
          staff_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          id: string
          name: string
          permissions: Json | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          permissions?: Json | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          permissions?: Json | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          location: string | null
          restaurant_id: string
          staff_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          location?: string | null
          restaurant_id: string
          staff_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          location?: string | null
          restaurant_id?: string
          staff_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_time_clock: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          restaurant_id: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          clock_in: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          components: Json | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          interval: Database["public"]["Enums"]["subscription_interval"]
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          components?: Json | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval: Database["public"]["Enums"]["subscription_interval"]
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          components?: Json | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: Database["public"]["Enums"]["subscription_interval"]
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      supplier_order_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_date: string
          restaurant_id: string
          status: string | null
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_date: string
          restaurant_id: string
          status?: string | null
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_date?: string
          restaurant_id?: string
          status?: string | null
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          minimum_order_amount: number | null
          name: string
          payment_terms: string | null
          phone: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          minimum_order_amount?: number | null
          name: string
          payment_terms?: string | null
          phone?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          minimum_order_amount?: number | null
          name?: string
          payment_terms?: string | null
          phone?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      table_availability_slots: {
        Row: {
          created_at: string
          date: string
          id: string
          is_available: boolean
          max_party_size: number | null
          restaurant_id: string
          table_id: string
          time_slot: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_available?: boolean
          max_party_size?: number | null
          restaurant_id: string
          table_id: string
          time_slot: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_available?: boolean
          max_party_size?: number | null
          restaurant_id?: string
          table_id?: string
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_availability_slots_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      table_reservations: {
        Row: {
          arrival_time: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          departure_time: string | null
          duration_minutes: number
          id: string
          notes: string | null
          party_size: number
          reservation_date: string
          reservation_time: string
          restaurant_id: string
          special_requests: string | null
          status: string
          table_id: string
          updated_at: string
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          departure_time?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          party_size: number
          reservation_date: string
          reservation_time: string
          restaurant_id: string
          special_requests?: string | null
          status?: string
          table_id: string
          updated_at?: string
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          departure_time?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          restaurant_id?: string
          special_requests?: string | null
          status?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customer_insights: {
        Row: {
          average_order_value: number | null
          customer_name: string | null
          first_visit: string | null
          last_visit: string | null
          restaurant_id: string | null
          total_spent: number | null
          visit_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_customer_activity: {
        Args: {
          customer_id_param: string
          restaurant_id_param: string
          activity_type_param: string
          description_param: string
        }
        Returns: {
          activity_type: string
          created_at: string | null
          customer_id: string | null
          description: string
          id: string
          restaurant_id: string | null
        }[]
      }
      add_customer_note: {
        Args: {
          customer_id_param: string
          restaurant_id_param: string
          content_param: string
          created_by_param: string
        }
        Returns: {
          content: string
          created_at: string | null
          created_by: string
          customer_id: string | null
          id: string
          restaurant_id: string | null
        }[]
      }
      add_loyalty_transaction: {
        Args: {
          customer_id_param: string
          restaurant_id_param: string
          transaction_type_param: string
          points_param: number
          source_param: string
          notes_param: string
          created_by_param: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          points: number
          restaurant_id: string
          source: string
          source_id: string | null
          transaction_type: string
        }[]
      }
      calculate_customer_tier: {
        Args: { customer_points: number; restaurant_id_param: string }
        Returns: string
      }
      generate_purchase_order_number: {
        Args: { restaurant_id_param: string }
        Returns: string
      }
      generate_time_slots_for_date: {
        Args: {
          p_restaurant_id: string
          p_date: string
          p_slot_duration_minutes?: number
        }
        Returns: {
          time_slot: string
        }[]
      }
      get_customer_activities: {
        Args: { customer_id_param: string }
        Returns: {
          activity_type: string
          created_at: string | null
          customer_id: string | null
          description: string
          id: string
          restaurant_id: string | null
        }[]
      }
      get_customer_notes: {
        Args: { customer_id_param: string }
        Returns: {
          content: string
          created_at: string | null
          created_by: string
          customer_id: string | null
          id: string
          restaurant_id: string | null
        }[]
      }
      get_loyalty_transactions: {
        Args: { customer_id_param: string }
        Returns: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          points: number
          restaurant_id: string
          source: string
          source_id: string | null
          transaction_type: string
        }[]
      }
      has_active_subscription: {
        Args: { restaurant_id: string }
        Returns: boolean
      }
      suggest_purchase_orders: {
        Args: { restaurant_id_param: string }
        Returns: {
          supplier_id: string
          supplier_name: string
          items_count: number
          estimated_total: number
        }[]
      }
    }
    Enums: {
      subscription_interval: "monthly" | "quarterly" | "half_yearly" | "yearly"
      user_role: "admin" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_interval: ["monthly", "quarterly", "half_yearly", "yearly"],
      user_role: ["admin", "manager"],
    },
  },
} as const
