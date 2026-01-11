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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_components: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          restaurant_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          restaurant_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          restaurant_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_settings: {
        Row: {
          auto_backup_enabled: boolean | null
          backup_frequency: string | null
          backup_time: string | null
          created_at: string
          id: string
          last_backup_at: string | null
          restaurant_id: string
          retention_days: number | null
          updated_at: string
        }
        Insert: {
          auto_backup_enabled?: boolean | null
          backup_frequency?: string | null
          backup_time?: string | null
          created_at?: string
          id?: string
          last_backup_at?: string | null
          restaurant_id: string
          retention_days?: number | null
          updated_at?: string
        }
        Update: {
          auto_backup_enabled?: boolean | null
          backup_frequency?: string | null
          backup_time?: string | null
          created_at?: string
          id?: string
          last_backup_at?: string | null
          restaurant_id?: string
          retention_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          backup_type: string
          created_at: string
          created_by: string | null
          file_size: number | null
          file_url: string | null
          id: string
          notes: string | null
          restaurant_id: string
          status: string | null
        }
        Insert: {
          backup_type: string
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          restaurant_id: string
          status?: string | null
        }
        Update: {
          backup_type?: string
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          restaurant_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_productions: {
        Row: {
          batch_number: string | null
          cost_per_unit: number | null
          created_at: string
          expiry_date: string | null
          id: string
          notes: string | null
          produced_by: string | null
          production_date: string
          quantity: number
          recipe_id: string
          restaurant_id: string
          status: string | null
          total_cost: number | null
          unit: Database["public"]["Enums"]["unit_of_measure"]
        }
        Insert: {
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          produced_by?: string | null
          production_date: string
          quantity: number
          recipe_id: string
          restaurant_id: string
          status?: string | null
          total_cost?: number | null
          unit: Database["public"]["Enums"]["unit_of_measure"]
        }
        Update: {
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          produced_by?: string | null
          production_date?: string
          quantity?: number
          recipe_id?: string
          restaurant_id?: string
          status?: string | null
          total_cost?: number | null
          unit?: Database["public"]["Enums"]["unit_of_measure"]
        }
        Relationships: [
          {
            foreignKeyName: "batch_productions_produced_by_fkey"
            columns: ["produced_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_productions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_productions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_channels: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          api_secret: string | null
          channel_name: string
          channel_settings: Json | null
          channel_type: string
          commission_rate: number | null
          created_at: string
          id: string
          is_active: boolean | null
          last_sync: string | null
          restaurant_id: string
          sync_frequency_minutes: number | null
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          api_secret?: string | null
          channel_name: string
          channel_settings?: Json | null
          channel_type: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          restaurant_id: string
          sync_frequency_minutes?: number | null
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          api_secret?: string | null
          channel_name?: string
          channel_settings?: Json | null
          channel_type?: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          restaurant_id?: string
          sync_frequency_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_channels_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_items: {
        Row: {
          account_id: string
          actual_amount: number | null
          budget_id: string
          budgeted_amount: number
          created_at: string
          id: string
          period_end: string
          period_start: string
          updated_at: string
          variance_amount: number | null
          variance_percentage: number | null
        }
        Insert: {
          account_id: string
          actual_amount?: number | null
          budget_id: string
          budgeted_amount: number
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Update: {
          account_id?: string
          actual_amount?: number | null
          budget_id?: string
          budgeted_amount?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          budget_name: string
          budget_type: string
          budget_year: number
          created_at: string
          created_by: string | null
          id: string
          restaurant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          budget_name: string
          budget_type: string
          budget_year: number
          created_at?: string
          created_by?: string | null
          id?: string
          restaurant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          budget_name?: string
          budget_type?: string
          budget_year?: number
          created_at?: string
          created_by?: string | null
          id?: string
          restaurant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          restaurant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          restaurant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          restaurant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_inventory: {
        Row: {
          available_rooms: number
          channel_id: string
          closed_to_arrival: boolean | null
          closed_to_departure: boolean | null
          created_at: string
          date: string
          id: string
          last_updated: string | null
          min_stay: number | null
          price: number
          rate_plan_id: string
          restaurant_id: string
          room_id: string
          stop_sell: boolean | null
        }
        Insert: {
          available_rooms?: number
          channel_id: string
          closed_to_arrival?: boolean | null
          closed_to_departure?: boolean | null
          created_at?: string
          date: string
          id?: string
          last_updated?: string | null
          min_stay?: number | null
          price: number
          rate_plan_id: string
          restaurant_id: string
          room_id: string
          stop_sell?: boolean | null
        }
        Update: {
          available_rooms?: number
          channel_id?: string
          closed_to_arrival?: boolean | null
          closed_to_departure?: boolean | null
          created_at?: string
          date?: string
          id?: string
          last_updated?: string | null
          min_stay?: number | null
          price?: number
          rate_plan_id?: string
          restaurant_id?: string
          room_id?: string
          stop_sell?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_inventory_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "booking_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_inventory_rate_plan_id_fkey"
            columns: ["rate_plan_id"]
            isOneToOne: false
            referencedRelation: "rate_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_inventory_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_inventory_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_subtype: string | null
          account_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          parent_account_id: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_subtype?: string | null
          account_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_account_id?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_subtype?: string | null
          account_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_account_id?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          actual_check_out: string | null
          additional_charges: Json | null
          check_in_method: string
          check_in_time: string
          created_at: string
          created_by: string | null
          expected_check_out: string
          guest_profile_id: string
          id: string
          key_cards_issued: number | null
          reservation_id: string
          restaurant_id: string
          room_id: string
          room_rate: number
          security_deposit: number | null
          special_requests: string | null
          staff_notes: string | null
          status: string
          total_guests: number
          updated_at: string
        }
        Insert: {
          actual_check_out?: string | null
          additional_charges?: Json | null
          check_in_method?: string
          check_in_time?: string
          created_at?: string
          created_by?: string | null
          expected_check_out: string
          guest_profile_id: string
          id?: string
          key_cards_issued?: number | null
          reservation_id: string
          restaurant_id: string
          room_id: string
          room_rate: number
          security_deposit?: number | null
          special_requests?: string | null
          staff_notes?: string | null
          status?: string
          total_guests?: number
          updated_at?: string
        }
        Update: {
          actual_check_out?: string | null
          additional_charges?: Json | null
          check_in_method?: string
          check_in_time?: string
          created_at?: string
          created_by?: string | null
          expected_check_out?: string
          guest_profile_id?: string
          id?: string
          key_cards_issued?: number | null
          reservation_id?: string
          restaurant_id?: string
          room_id?: string
          room_rate?: number
          security_deposit?: number | null
          special_requests?: string | null
          staff_notes?: string | null
          status?: string
          total_guests?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_guest_profile_id_fkey"
            columns: ["guest_profile_id"]
            isOneToOne: false
            referencedRelation: "guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_pricing: {
        Row: {
          competitor_name: string
          competitor_url: string | null
          created_at: string
          currency: string | null
          date: string
          id: string
          last_scraped: string | null
          price: number
          restaurant_id: string
          room_type: string | null
        }
        Insert: {
          competitor_name: string
          competitor_url?: string | null
          created_at?: string
          currency?: string | null
          date: string
          id?: string
          last_scraped?: string | null
          price: number
          restaurant_id: string
          room_type?: string | null
        }
        Update: {
          competitor_name?: string
          competitor_url?: string | null
          created_at?: string
          currency?: string | null
          date?: string
          id?: string
          last_scraped?: string | null
          price?: number
          restaurant_id?: string
          room_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_pricing_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      component_permissions: {
        Row: {
          component_name: string
          created_at: string | null
          id: string
          restaurant_id: string | null
          role_name: string
        }
        Insert: {
          component_name: string
          created_at?: string | null
          id?: string
          restaurant_id?: string | null
          role_name: string
        }
        Update: {
          component_name?: string
          created_at?: string | null
          id?: string
          restaurant_id?: string | null
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_permissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      component_table_mapping: {
        Row: {
          component_name: string
          created_at: string | null
          id: string
          table_name: string
        }
        Insert: {
          component_name: string
          created_at?: string | null
          id?: string
          table_name: string
        }
        Update: {
          component_name?: string
          created_at?: string | null
          id?: string
          table_name?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          exchange_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          exchange_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          exchange_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          symbol?: string
        }
        Relationships: []
      }
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
          allergies: string[] | null
          created_at: string
          date_of_birth: string | null
          dietary_preferences: string[] | null
          email: string | null
          id: string
          is_active: boolean | null
          last_visit: string | null
          loyalty_points: number | null
          loyalty_tier: string | null
          name: string
          notes: string | null
          phone: string | null
          preferred_payment_method: string | null
          restaurant_id: string | null
          total_spent: number | null
          total_visits: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          dietary_preferences?: string[] | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_visit?: string | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferred_payment_method?: string | null
          restaurant_id?: string | null
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          dietary_preferences?: string[] | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_visit?: string | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_payment_method?: string | null
          restaurant_id?: string | null
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string
        }
        Relationships: [
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
          average_order_value: number | null
          beverage_revenue: number | null
          created_at: string
          date: string
          food_revenue: number | null
          id: string
          order_count: number | null
          other_revenue: number | null
          restaurant_id: string
          room_revenue: number | null
          total_revenue: number | null
        }
        Insert: {
          average_order_value?: number | null
          beverage_revenue?: number | null
          created_at?: string
          date: string
          food_revenue?: number | null
          id?: string
          order_count?: number | null
          other_revenue?: number | null
          restaurant_id: string
          room_revenue?: number | null
          total_revenue?: number | null
        }
        Update: {
          average_order_value?: number | null
          beverage_revenue?: number | null
          created_at?: string
          date?: string
          food_revenue?: number | null
          id?: string
          order_count?: number | null
          other_revenue?: number | null
          restaurant_id?: string
          room_revenue?: number | null
          total_revenue?: number | null
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
          restaurant_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date: string
          id?: string
          is_recurring?: boolean | null
          payment_method?: string | null
          receipt_url?: string | null
          restaurant_id: string
          vendor?: string | null
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
          restaurant_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_reports: {
        Row: {
          generated_at: string
          generated_by: string | null
          id: string
          report_data: Json
          report_period_end: string
          report_period_start: string
          report_type: string
          restaurant_id: string
        }
        Insert: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_data: Json
          report_period_end: string
          report_period_start: string
          report_type: string
          restaurant_id: string
        }
        Update: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_data?: Json
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_reports_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_feedback: {
        Row: {
          category: string | null
          created_at: string
          feedback: string | null
          guest_profile_id: string | null
          id: string
          rating: number | null
          reservation_id: string | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          restaurant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          feedback?: string | null
          guest_profile_id?: string | null
          id?: string
          rating?: number | null
          reservation_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          restaurant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          feedback?: string | null
          guest_profile_id?: string | null
          id?: string
          rating?: number | null
          reservation_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_feedback_guest_profile_id_fkey"
            columns: ["guest_profile_id"]
            isOneToOne: false
            referencedRelation: "guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_feedback_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_feedback_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_loyalty: {
        Row: {
          created_at: string
          guest_profile_id: string
          id: string
          lifetime_points: number | null
          points_balance: number | null
          program_id: string | null
          tier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_profile_id: string
          id?: string
          lifetime_points?: number | null
          points_balance?: number | null
          program_id?: string | null
          tier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_profile_id?: string
          id?: string
          lifetime_points?: number | null
          points_balance?: number | null
          program_id?: string | null
          tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_loyalty_guest_profile_id_fkey"
            columns: ["guest_profile_id"]
            isOneToOne: false
            referencedRelation: "guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_loyalty_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_loyalty_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_preferences: {
        Row: {
          created_at: string
          guest_profile_id: string
          id: string
          preference_type: string
          preference_value: Json
        }
        Insert: {
          created_at?: string
          guest_profile_id: string
          id?: string
          preference_type: string
          preference_value: Json
        }
        Update: {
          created_at?: string
          guest_profile_id?: string
          id?: string
          preference_type?: string
          preference_value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "guest_preferences_guest_profile_id_fkey"
            columns: ["guest_profile_id"]
            isOneToOne: false
            referencedRelation: "guest_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_profiles: {
        Row: {
          address: Json | null
          blacklisted: boolean | null
          created_at: string
          date_of_birth: string | null
          emergency_contact: Json | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          id_number: string | null
          id_type: string | null
          last_stay: string | null
          nationality: string | null
          notes: string | null
          preferences: Json | null
          restaurant_id: string
          total_spent: number | null
          total_stays: number | null
          updated_at: string
          vip_status: boolean | null
        }
        Insert: {
          address?: Json | null
          blacklisted?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: Json | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          last_stay?: string | null
          nationality?: string | null
          notes?: string | null
          preferences?: Json | null
          restaurant_id: string
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string
          vip_status?: boolean | null
        }
        Update: {
          address?: Json | null
          blacklisted?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: Json | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          last_stay?: string | null
          nationality?: string | null
          notes?: string | null
          preferences?: Json | null
          restaurant_id?: string
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string
          vip_status?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          inventory_item_id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          resolved_at: string | null
          restaurant_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          inventory_item_id: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          resolved_at?: string | null
          restaurant_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          inventory_item_id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          resolved_at?: string | null
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
          {
            foreignKeyName: "inventory_alerts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          category: string | null
          cost_per_unit: number | null
          created_at: string
          current_stock: number | null
          description: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          reorder_point: number | null
          restaurant_id: string
          sku: string | null
          storage_location: string | null
          unit: Database["public"]["Enums"]["unit_of_measure"]
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          reorder_point?: number | null
          restaurant_id: string
          sku?: string | null
          storage_location?: string | null
          unit?: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          reorder_point?: number | null
          restaurant_id?: string
          sku?: string | null
          storage_location?: string | null
          unit?: Database["public"]["Enums"]["unit_of_measure"]
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
          quantity: number
          reference_id: string | null
          reference_type: string | null
          restaurant_id: string
          total_cost: number | null
          transaction_type: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id: string
          total_cost?: number | null
          transaction_type: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string
          total_cost?: number | null
          transaction_type?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          tax_rate: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          tax_rate?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          tax_rate?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_amount: number
          payment_terms: string | null
          restaurant_id: string
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number
          payment_terms?: string | null
          restaurant_id: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number
          payment_terms?: string | null
          restaurant_id?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          id: string
          reference_id: string | null
          reference_type: string | null
          restaurant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          entry_date: string
          entry_number: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_orders: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          estimated_time: number | null
          id: string
          items: Json
          notes: string | null
          order_id: string
          priority: number | null
          restaurant_id: string
          started_at: string | null
          status: string
          table_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_time?: number | null
          id?: string
          items?: Json
          notes?: string | null
          order_id: string
          priority?: number | null
          restaurant_id: string
          started_at?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_time?: number | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string
          priority?: number | null
          restaurant_id?: string
          started_at?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "kitchen_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found_items: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          disposed_at: string | null
          found_by: string | null
          found_date: string
          found_location: string | null
          id: string
          images: string[] | null
          item_description: string
          notes: string | null
          restaurant_id: string
          room_id: string | null
          status: string | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          disposed_at?: string | null
          found_by?: string | null
          found_date: string
          found_location?: string | null
          id?: string
          images?: string[] | null
          item_description: string
          notes?: string | null
          restaurant_id: string
          room_id?: string | null
          status?: string | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          disposed_at?: string | null
          found_by?: string | null
          found_date?: string
          found_location?: string | null
          id?: string
          images?: string[] | null
          item_description?: string
          notes?: string | null
          restaurant_id?: string
          room_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_items_found_by_fkey"
            columns: ["found_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_enrollments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          birthday: string | null
          customer_id: string | null
          email: string | null
          enrolled_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          name: string
          phone: string | null
          restaurant_id: string
          source: string | null
          status: string | null
          user_agent: string | null
          welcome_points_awarded: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          birthday?: string | null
          customer_id?: string | null
          email?: string | null
          enrolled_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          name: string
          phone?: string | null
          restaurant_id: string
          source?: string | null
          status?: string | null
          user_agent?: string | null
          welcome_points_awarded?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          birthday?: string | null
          customer_id?: string | null
          email?: string | null
          enrolled_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          name?: string
          phone?: string | null
          restaurant_id?: string
          source?: string | null
          status?: string | null
          user_agent?: string | null
          welcome_points_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_enrollments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_enrollments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_enrollments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_per_currency: number | null
          points_to_currency_ratio: number | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_per_currency?: number | null
          points_to_currency_ratio?: number | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_per_currency?: number | null
          points_to_currency_ratio?: number | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_redemptions: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          order_id: string | null
          points_used: number
          restaurant_id: string
          reward_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          order_id?: string | null
          points_used: number
          restaurant_id: string
          reward_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          points_used?: number
          restaurant_id?: string
          reward_id?: string
          status?: string | null
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
          quantity_available: number | null
          restaurant_id: string
          reward_type: string
          reward_value: Json
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_required: number
          quantity_available?: number | null
          restaurant_id: string
          reward_type: string
          reward_value: Json
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number
          quantity_available?: number | null
          restaurant_id?: string
          reward_type?: string
          reward_value?: Json
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          benefits: Json | null
          color: string | null
          created_at: string
          discount_percentage: number | null
          icon: string | null
          id: string
          max_points: number | null
          min_points: number
          name: string
          program_id: string | null
          restaurant_id: string
        }
        Insert: {
          benefits?: Json | null
          color?: string | null
          created_at?: string
          discount_percentage?: number | null
          icon?: string | null
          id?: string
          max_points?: number | null
          min_points?: number
          name: string
          program_id?: string | null
          restaurant_id: string
        }
        Update: {
          benefits?: Json | null
          color?: string | null
          created_at?: string
          discount_percentage?: number | null
          icon?: string | null
          id?: string
          max_points?: number | null
          min_points?: number
          name?: string
          program_id?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_tiers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
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
          balance_after: number | null
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          restaurant_id: string | null
          transaction_type: string
        }
        Insert: {
          balance_after?: number | null
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          restaurant_id?: string | null
          transaction_type: string
        }
        Update: {
          balance_after?: number | null
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          restaurant_id?: string | null
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
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          allergens: string[] | null
          calories: number | null
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number | null
          full_price: number | null
          half_price: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_veg: boolean | null
          name: string
          preparation_time: number | null
          price: number
          pricing_type: string | null
          restaurant_id: string
          spice_level: number | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          calories?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          full_price?: number | null
          half_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_veg?: boolean | null
          name: string
          preparation_time?: number | null
          price: number
          pricing_type?: string | null
          restaurant_id: string
          spice_level?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          calories?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          full_price?: number | null
          half_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_veg?: boolean | null
          name?: string
          preparation_time?: number | null
          price?: number
          pricing_type?: string | null
          restaurant_id?: string
          spice_level?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
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
          budget_amount: number
          category: string | null
          created_at: string
          id: string
          month: number
          restaurant_id: string
          year: number
        }
        Insert: {
          actual_amount?: number | null
          budget_amount?: number
          category?: string | null
          created_at?: string
          id?: string
          month: number
          restaurant_id: string
          year: number
        }
        Update: {
          actual_amount?: number | null
          budget_amount?: number
          category?: string | null
          created_at?: string
          id?: string
          month?: number
          restaurant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      night_audit_logs: {
        Row: {
          audit_date: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          discrepancies: Json | null
          food_revenue: number | null
          id: string
          notes: string | null
          occupancy_rate: number | null
          restaurant_id: string
          room_revenue: number | null
          rooms_available: number | null
          rooms_occupied: number | null
          total_revenue: number | null
        }
        Insert: {
          audit_date: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          discrepancies?: Json | null
          food_revenue?: number | null
          id?: string
          notes?: string | null
          occupancy_rate?: number | null
          restaurant_id: string
          room_revenue?: number | null
          rooms_available?: number | null
          rooms_occupied?: number | null
          total_revenue?: number | null
        }
        Update: {
          audit_date?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          discrepancies?: Json | null
          food_revenue?: number | null
          id?: string
          notes?: string | null
          occupancy_rate?: number | null
          restaurant_id?: string
          room_revenue?: number | null
          rooms_available?: number | null
          rooms_occupied?: number | null
          total_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "night_audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_costs: {
        Row: {
          amount: number
          cost_type: string
          created_at: string
          description: string | null
          id: string
          period_end: string
          period_start: string
          restaurant_id: string
        }
        Insert: {
          amount: number
          cost_type: string
          created_at?: string
          description?: string | null
          id?: string
          period_end: string
          period_start: string
          restaurant_id: string
        }
        Update: {
          amount?: number
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          period_end?: string
          period_start?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cgst_amount: number | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_gstin: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_charges: number | null
          discount_amount: number | null
          id: string
          igst_amount: number | null
          is_b2b: boolean | null
          notes: string | null
          order_number: string | null
          order_type: string
          packaging_charges: number | null
          payment_method: string | null
          payment_status: string | null
          restaurant_id: string
          round_off: number | null
          service_charge: number | null
          sgst_amount: number | null
          special_instructions: string | null
          status: string
          subtotal: number | null
          table_id: string | null
          tax_amount: number | null
          tip_amount: number | null
          total_amount: number | null
          updated_at: string
          waiter_id: string | null
        }
        Insert: {
          cgst_amount?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_gstin?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_charges?: number | null
          discount_amount?: number | null
          id?: string
          igst_amount?: number | null
          is_b2b?: boolean | null
          notes?: string | null
          order_number?: string | null
          order_type?: string
          packaging_charges?: number | null
          payment_method?: string | null
          payment_status?: string | null
          restaurant_id: string
          round_off?: number | null
          service_charge?: number | null
          sgst_amount?: number | null
          special_instructions?: string | null
          status?: string
          subtotal?: number | null
          table_id?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          waiter_id?: string | null
        }
        Update: {
          cgst_amount?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_gstin?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_charges?: number | null
          discount_amount?: number | null
          id?: string
          igst_amount?: number | null
          is_b2b?: boolean | null
          notes?: string | null
          order_number?: string | null
          order_type?: string
          packaging_charges?: number | null
          payment_method?: string | null
          payment_status?: string | null
          restaurant_id?: string
          round_off?: number | null
          service_charge?: number | null
          sgst_amount?: number | null
          special_instructions?: string | null
          status?: string
          subtotal?: number | null
          table_id?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_unified: {
        Row: {
          assigned_to: string | null
          cgst_amount: number | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_gstin: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_charges: number | null
          discount_amount: number | null
          estimated_time: number | null
          id: string
          igst_amount: number | null
          is_b2b: boolean | null
          items: Json
          items_completion: Json | null
          kitchen_status: string | null
          notes: string | null
          order_number: string | null
          order_type: string
          packaging_charges: number | null
          payment_method: string | null
          payment_status: string | null
          priority: number | null
          restaurant_id: string
          round_off: number | null
          service_charge: number | null
          sgst_amount: number | null
          source: string | null
          special_instructions: string | null
          started_at: string | null
          status: string | null
          subtotal: number | null
          table_id: string | null
          tax_amount: number | null
          tip_amount: number | null
          total_amount: number
          updated_at: string
          waiter_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          cgst_amount?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_gstin?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_charges?: number | null
          discount_amount?: number | null
          estimated_time?: number | null
          id?: string
          igst_amount?: number | null
          is_b2b?: boolean | null
          items?: Json
          items_completion?: Json | null
          kitchen_status?: string | null
          notes?: string | null
          order_number?: string | null
          order_type?: string
          packaging_charges?: number | null
          payment_method?: string | null
          payment_status?: string | null
          priority?: number | null
          restaurant_id: string
          round_off?: number | null
          service_charge?: number | null
          sgst_amount?: number | null
          source?: string | null
          special_instructions?: string | null
          started_at?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount?: number
          updated_at?: string
          waiter_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          cgst_amount?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_gstin?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_charges?: number | null
          discount_amount?: number | null
          estimated_time?: number | null
          id?: string
          igst_amount?: number | null
          is_b2b?: boolean | null
          items?: Json
          items_completion?: Json | null
          kitchen_status?: string | null
          notes?: string | null
          order_number?: string | null
          order_type?: string
          packaging_charges?: number | null
          payment_method?: string | null
          payment_status?: string | null
          priority?: number | null
          restaurant_id?: string
          round_off?: number | null
          service_charge?: number | null
          sgst_amount?: number | null
          source?: string | null
          special_instructions?: string | null
          started_at?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount?: number
          updated_at?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_unified_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          configuration: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          restaurant_id: string
          type: string
        }
        Insert: {
          configuration?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          restaurant_id: string
          type: string
        }
        Update: {
          configuration?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          card_enabled: boolean | null
          cash_enabled: boolean | null
          created_at: string
          credit_enabled: boolean | null
          default_tip_percentages: Json | null
          id: string
          online_enabled: boolean | null
          payment_gateway_config: Json | null
          restaurant_id: string
          split_bill_enabled: boolean | null
          tip_enabled: boolean | null
          updated_at: string
          upi_enabled: boolean | null
        }
        Insert: {
          card_enabled?: boolean | null
          cash_enabled?: boolean | null
          created_at?: string
          credit_enabled?: boolean | null
          default_tip_percentages?: Json | null
          id?: string
          online_enabled?: boolean | null
          payment_gateway_config?: Json | null
          restaurant_id: string
          split_bill_enabled?: boolean | null
          tip_enabled?: boolean | null
          updated_at?: string
          upi_enabled?: boolean | null
        }
        Update: {
          card_enabled?: boolean | null
          cash_enabled?: boolean | null
          created_at?: string
          credit_enabled?: boolean | null
          default_tip_percentages?: Json | null
          id?: string
          online_enabled?: boolean | null
          payment_gateway_config?: Json | null
          restaurant_id?: string
          split_bill_enabled?: boolean | null
          tip_enabled?: boolean | null
          updated_at?: string
          upi_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          reference_number: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          reference_number?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          reference_number?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          payment_method: string | null
          reference_number: string | null
          restaurant_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          payment_method?: string | null
          reference_number?: string | null
          restaurant_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          payment_method?: string | null
          reference_number?: string | null
          restaurant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          created_at: string
          days_of_week: Json | null
          id: string
          is_active: boolean | null
          max_price: number | null
          min_price: number | null
          priority: number | null
          restaurant_id: string
          rule_name: string
          rule_type: string
          trigger_condition: Json
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          adjustment_type: string
          adjustment_value: number
          created_at?: string
          days_of_week?: Json | null
          id?: string
          is_active?: boolean | null
          max_price?: number | null
          min_price?: number | null
          priority?: number | null
          restaurant_id: string
          rule_name: string
          rule_type: string
          trigger_condition: Json
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          created_at?: string
          days_of_week?: Json | null
          id?: string
          is_active?: boolean | null
          max_price?: number | null
          min_price?: number | null
          priority?: number | null
          restaurant_id?: string
          rule_name?: string
          rule_type?: string
          trigger_condition?: Json
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_restaurant_id_fkey"
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
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          restaurant_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_id: string | null
          role_name_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          restaurant_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          role_name_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          restaurant_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          role_name_text?: string | null
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
          discount_type: string | null
          discount_value: number | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_order_value: number | null
          name: string
          promo_code: string | null
          restaurant_id: string
          terms_conditions: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_value?: number | null
          name: string
          promo_code?: string | null
          restaurant_id: string
          terms_conditions?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_value?: number | null
          name?: string
          promo_code?: string | null
          restaurant_id?: string
          terms_conditions?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          item_name: string
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          total_price: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          item_name: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number | null
          total_price: number
          unit: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          item_name?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          total_price?: number
          unit?: string
          unit_price?: number
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
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          received_at: string | null
          restaurant_id: string
          status: string | null
          subtotal: number | null
          supplier_id: string
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date: string
          po_number: string
          received_at?: string | null
          restaurant_id: string
          status?: string | null
          subtotal?: number | null
          supplier_id: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          received_at?: string | null
          restaurant_id?: string
          status?: string | null
          subtotal?: number | null
          supplier_id?: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_plans: {
        Row: {
          advance_booking_days: number | null
          base_rate: number
          blackout_dates: Json | null
          cancellation_policy: Json | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean | null
          is_refundable: boolean | null
          max_stay_nights: number | null
          min_stay_nights: number | null
          name: string
          plan_type: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          advance_booking_days?: number | null
          base_rate: number
          blackout_dates?: Json | null
          cancellation_policy?: Json | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_refundable?: boolean | null
          max_stay_nights?: number | null
          min_stay_nights?: number | null
          name: string
          plan_type: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          advance_booking_days?: number | null
          base_rate?: number
          blackout_dates?: Json | null
          cancellation_policy?: Json | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_refundable?: boolean | null
          max_stay_nights?: number | null
          min_stay_nights?: number | null
          name?: string
          plan_type?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_plans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          is_optional: boolean | null
          preparation_notes: string | null
          quantity: number
          recipe_id: string
          unit: Database["public"]["Enums"]["unit_of_measure"]
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          is_optional?: boolean | null
          preparation_notes?: string | null
          quantity: number
          recipe_id: string
          unit: Database["public"]["Enums"]["unit_of_measure"]
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          is_optional?: boolean | null
          preparation_notes?: string | null
          quantity?: number
          recipe_id?: string
          unit?: Database["public"]["Enums"]["unit_of_measure"]
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: Database["public"]["Enums"]["recipe_category"] | null
          cooking_time_minutes: number | null
          cost_per_serving: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          menu_item_id: string | null
          name: string
          preparation_steps: Json | null
          preparation_time_minutes: number | null
          restaurant_id: string
          servings: number | null
          updated_at: string
          yield_quantity: number | null
          yield_unit: Database["public"]["Enums"]["unit_of_measure"] | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["recipe_category"] | null
          cooking_time_minutes?: number | null
          cost_per_serving?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          menu_item_id?: string | null
          name: string
          preparation_steps?: Json | null
          preparation_time_minutes?: number | null
          restaurant_id: string
          servings?: number | null
          updated_at?: string
          yield_quantity?: number | null
          yield_unit?: Database["public"]["Enums"]["unit_of_measure"] | null
        }
        Update: {
          category?: Database["public"]["Enums"]["recipe_category"] | null
          cooking_time_minutes?: number | null
          cost_per_serving?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          menu_item_id?: string | null
          name?: string
          preparation_steps?: Json | null
          preparation_time_minutes?: number | null
          restaurant_id?: string
          servings?: number | null
          updated_at?: string
          yield_quantity?: number | null
          yield_unit?: Database["public"]["Enums"]["unit_of_measure"] | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          check_in_date: string
          check_out_date: string
          confirmation_number: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          num_guests: number | null
          num_nights: number | null
          payment_status: string | null
          restaurant_id: string
          room_id: string | null
          room_rate: number | null
          source: string | null
          special_requests: string | null
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          check_in_date: string
          check_out_date: string
          confirmation_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          num_guests?: number | null
          num_nights?: number | null
          payment_status?: string | null
          restaurant_id: string
          room_id?: string | null
          room_rate?: number | null
          source?: string | null
          special_requests?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          check_in_date?: string
          check_out_date?: string
          confirmation_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          num_guests?: number | null
          num_nights?: number | null
          payment_status?: string | null
          restaurant_id?: string
          room_id?: string | null
          room_rate?: number | null
          source?: string | null
          special_requests?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
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
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string
          restaurant_id: string
        }
        Insert: {
          close_time: string
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time: string
          restaurant_id: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          open_time?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_operating_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_settings: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          restaurant_id: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          plan_id: string
          restaurant_id: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          restaurant_id?: string
          status?: string
          trial_ends_at?: string | null
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
            isOneToOne: false
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
          is_active: boolean | null
          location: string | null
          position_x: number | null
          position_y: number | null
          restaurant_id: string
          shape: string | null
          status: string
          table_number: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          position_x?: number | null
          position_y?: number | null
          restaurant_id: string
          shape?: string | null
          status?: string
          table_number: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          position_x?: number | null
          position_y?: number | null
          restaurant_id?: string
          shape?: string | null
          status?: string
          table_number?: string
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
          account_number: string | null
          address: string | null
          bank_name: string | null
          created_at: string
          cuisine_types: string[] | null
          delivery_radius_km: number | null
          description: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          established_date: string | null
          gstin: string | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          license_number: string | null
          name: string
          operating_hours: Json | null
          owner_address: string | null
          owner_email: string | null
          owner_id_number: string | null
          owner_id_type: string | null
          owner_name: string | null
          owner_phone: string | null
          pan_number: string | null
          payment_gateway_enabled: boolean | null
          phone: string | null
          rating: number | null
          registration_number: string | null
          seating_capacity: number | null
          slug: string | null
          social_media: Json | null
          total_reviews: number | null
          updated_at: string
          upi_id: string | null
          verification_status: string | null
          website: string | null
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          created_at?: string
          cuisine_types?: string[] | null
          delivery_radius_km?: number | null
          description?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          established_date?: string | null
          gstin?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          license_number?: string | null
          name: string
          operating_hours?: Json | null
          owner_address?: string | null
          owner_email?: string | null
          owner_id_number?: string | null
          owner_id_type?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          pan_number?: string | null
          payment_gateway_enabled?: boolean | null
          phone?: string | null
          rating?: number | null
          registration_number?: string | null
          seating_capacity?: number | null
          slug?: string | null
          social_media?: Json | null
          total_reviews?: number | null
          updated_at?: string
          upi_id?: string | null
          verification_status?: string | null
          website?: string | null
        }
        Update: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          created_at?: string
          cuisine_types?: string[] | null
          delivery_radius_km?: number | null
          description?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          established_date?: string | null
          gstin?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          license_number?: string | null
          name?: string
          operating_hours?: Json | null
          owner_address?: string | null
          owner_email?: string | null
          owner_id_number?: string | null
          owner_id_type?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          pan_number?: string | null
          payment_gateway_enabled?: boolean | null
          phone?: string | null
          rating?: number | null
          registration_number?: string | null
          seating_capacity?: number | null
          slug?: string | null
          social_media?: Json | null
          total_reviews?: number | null
          updated_at?: string
          upi_id?: string | null
          verification_status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      revenue_metrics: {
        Row: {
          adr: number | null
          created_at: string
          date: string
          f_and_b_revenue: number | null
          id: string
          occupancy_rate: number | null
          occupied_rooms: number | null
          restaurant_id: string
          revpar: number | null
          room_revenue: number | null
          total_revenue: number | null
          total_rooms: number | null
          updated_at: string
        }
        Insert: {
          adr?: number | null
          created_at?: string
          date: string
          f_and_b_revenue?: number | null
          id?: string
          occupancy_rate?: number | null
          occupied_rooms?: number | null
          restaurant_id: string
          revpar?: number | null
          room_revenue?: number | null
          total_revenue?: number | null
          total_rooms?: number | null
          updated_at?: string
        }
        Update: {
          adr?: number | null
          created_at?: string
          date?: string
          f_and_b_revenue?: number | null
          id?: string
          occupancy_rate?: number | null
          occupied_rooms?: number | null
          restaurant_id?: string
          revpar?: number | null
          room_revenue?: number | null
          total_revenue?: number | null
          total_rooms?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_metrics_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_components: {
        Row: {
          component_id: string
          created_at: string
          id: string
          role_id: string
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          role_id: string
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "app_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_components_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          has_full_access: boolean | null
          id: string
          is_deletable: boolean | null
          is_system: boolean | null
          is_system_role: boolean | null
          name: string
          restaurant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          has_full_access?: boolean | null
          id?: string
          is_deletable?: boolean | null
          is_system?: boolean | null
          is_system_role?: boolean | null
          name: string
          restaurant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          has_full_access?: boolean | null
          id?: string
          is_deletable?: boolean | null
          is_system?: boolean | null
          is_system_role?: boolean | null
          name?: string
          restaurant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_amenities: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          restaurant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          restaurant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_amenities_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_amenity_inventory: {
        Row: {
          amenity_id: string
          created_at: string
          id: string
          quantity: number | null
          room_id: string
        }
        Insert: {
          amenity_id: string
          created_at?: string
          id?: string
          quantity?: number | null
          room_id: string
        }
        Update: {
          amenity_id?: string
          created_at?: string
          id?: string
          quantity?: number | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_amenity_inventory_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "room_amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_amenity_inventory_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_billings: {
        Row: {
          billing_type: string
          created_at: string
          created_by: string | null
          description: string
          discount_amount: number | null
          id: string
          is_paid: boolean | null
          notes: string | null
          payment_method: string | null
          quantity: number | null
          reservation_id: string | null
          restaurant_id: string
          room_id: string | null
          tax_amount: number | null
          total_amount: number
          unit_price: number
        }
        Insert: {
          billing_type: string
          created_at?: string
          created_by?: string | null
          description: string
          discount_amount?: number | null
          id?: string
          is_paid?: boolean | null
          notes?: string | null
          payment_method?: string | null
          quantity?: number | null
          reservation_id?: string | null
          restaurant_id: string
          room_id?: string | null
          tax_amount?: number | null
          total_amount: number
          unit_price: number
        }
        Update: {
          billing_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          discount_amount?: number | null
          id?: string
          is_paid?: boolean | null
          notes?: string | null
          payment_method?: string | null
          quantity?: number | null
          reservation_id?: string | null
          restaurant_id?: string
          room_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          unit_price?: number
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
      room_cleaning_schedules: {
        Row: {
          assigned_to: string | null
          checklist: Json | null
          cleaning_type: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          restaurant_id: string
          room_id: string
          scheduled_date: string
          scheduled_time: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          checklist?: Json | null
          cleaning_type?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id: string
          room_id: string
          scheduled_date: string
          scheduled_time?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          checklist?: Json | null
          cleaning_type?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id?: string
          room_id?: string
          scheduled_date?: string
          scheduled_time?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_cleaning_schedules_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_cleaning_schedules_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_cleaning_schedules_room_id_fkey"
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
          delivery_time: string | null
          id: string
          items: Json
          notes: string | null
          order_id: string | null
          reservation_id: string | null
          restaurant_id: string
          room_id: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_time?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          reservation_id?: string | null
          restaurant_id: string
          room_id: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_time?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          reservation_id?: string | null
          restaurant_id?: string
          room_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_food_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_food_orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
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
      room_maintenance_requests: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string
          estimated_cost: number | null
          id: string
          notes: string | null
          priority: string | null
          reported_by: string | null
          request_type: string
          restaurant_id: string
          room_id: string
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          reported_by?: string | null
          request_type: string
          restaurant_id: string
          room_id: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          reported_by?: string | null
          request_type?: string
          restaurant_id?: string
          room_id?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_maintenance_requests_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_maintenance_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_moves: {
        Row: {
          from_room_id: string
          id: string
          moved_at: string
          moved_by: string | null
          reason: string | null
          reservation_id: string | null
          restaurant_id: string
          to_room_id: string
        }
        Insert: {
          from_room_id: string
          id?: string
          moved_at?: string
          moved_by?: string | null
          reason?: string | null
          reservation_id?: string | null
          restaurant_id: string
          to_room_id: string
        }
        Update: {
          from_room_id?: string
          id?: string
          moved_at?: string
          moved_by?: string | null
          reason?: string | null
          reservation_id?: string | null
          restaurant_id?: string
          to_room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_moves_from_room_id_fkey"
            columns: ["from_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_moves_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_moves_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_moves_to_room_id_fkey"
            columns: ["to_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_waitlist: {
        Row: {
          check_in_date: string
          check_out_date: string
          created_at: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          num_guests: number | null
          restaurant_id: string
          room_type: string | null
          status: string | null
        }
        Insert: {
          check_in_date: string
          check_out_date: string
          created_at?: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          num_guests?: number | null
          restaurant_id: string
          room_type?: string | null
          status?: string | null
        }
        Update: {
          check_in_date?: string
          check_out_date?: string
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          num_guests?: number | null
          restaurant_id?: string
          room_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_waitlist_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          amenities: string[] | null
          base_price: number
          capacity: number | null
          created_at: string
          description: string | null
          floor: number | null
          id: string
          images: string[] | null
          is_active: boolean | null
          last_cleaned: string | null
          restaurant_id: string
          room_number: string
          room_type: string
          status: string
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          base_price: number
          capacity?: number | null
          created_at?: string
          description?: string | null
          floor?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          last_cleaned?: string | null
          restaurant_id: string
          room_number: string
          room_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          base_price?: number
          capacity?: number | null
          created_at?: string
          description?: string | null
          floor?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          last_cleaned?: string | null
          restaurant_id?: string
          room_number?: string
          room_type?: string
          status?: string
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
          campaign_id: string | null
          channel: string
          clicked_at: string | null
          customer_id: string | null
          id: string
          opened_at: string | null
          restaurant_id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel: string
          clicked_at?: string | null
          customer_id?: string | null
          id?: string
          opened_at?: string | null
          restaurant_id: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: string
          clicked_at?: string | null
          customer_id?: string | null
          id?: string
          opened_at?: string | null
          restaurant_id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sent_promotions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_promotions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          notes: string | null
          restaurant_id: string
          shift_date: string
          staff_id: string
          start_time: string
          status: string | null
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          restaurant_id: string
          shift_date: string
          staff_id: string
          start_time: string
          status?: string | null
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          restaurant_id?: string
          shift_date?: string
          staff_id?: string
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      split_bill_portions: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_paid: boolean | null
          items: Json | null
          paid_at: string | null
          payment_method: string | null
          portion_number: number
          split_bill_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_paid?: boolean | null
          items?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          portion_number: number
          split_bill_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_paid?: boolean | null
          items?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          portion_number?: number
          split_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_bill_portions_split_bill_id_fkey"
            columns: ["split_bill_id"]
            isOneToOne: false
            referencedRelation: "split_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      split_bills: {
        Row: {
          created_at: string
          id: string
          num_ways: number | null
          order_id: string
          restaurant_id: string
          split_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          num_ways?: number | null
          order_id: string
          restaurant_id: string
          split_type: string
        }
        Update: {
          created_at?: string
          id?: string
          num_ways?: number | null
          order_id?: string
          restaurant_id?: string
          split_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_bills_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_bills_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          availability_notes: string | null
          created_at: string
          documents: Json | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employment_type: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          phone: string | null
          photo_url: string | null
          position: string | null
          restaurant_id: string
          role_ids: string[] | null
          salary: number | null
          salary_type: string | null
          Shift: string | null
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          availability_notes?: string | null
          created_at?: string
          documents?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          restaurant_id: string
          role_ids?: string[] | null
          salary?: number | null
          salary_type?: string | null
          Shift?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          availability_notes?: string | null
          created_at?: string
          documents?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          restaurant_id?: string
          role_ids?: string[] | null
          salary?: number | null
          salary_type?: string | null
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
      staff_documents: {
        Row: {
          document_name: string | null
          document_type: string
          document_url: string
          expiry_date: string | null
          id: string
          staff_id: string
          uploaded_at: string
        }
        Insert: {
          document_name?: string | null
          document_type: string
          document_url: string
          expiry_date?: string | null
          id?: string
          staff_id: string
          uploaded_at?: string
        }
        Update: {
          document_name?: string | null
          document_type?: string
          document_url?: string
          expiry_date?: string | null
          id?: string
          staff_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leave_balances: {
        Row: {
          balance: number | null
          created_at: string
          id: string
          leave_type_id: string
          staff_id: string
          updated_at: string
          used: number | null
          year: number
        }
        Insert: {
          balance?: number | null
          created_at?: string
          id?: string
          leave_type_id: string
          staff_id: string
          updated_at?: string
          used?: number | null
          year: number
        }
        Update: {
          balance?: number | null
          created_at?: string
          id?: string
          leave_type_id?: string
          staff_id?: string
          updated_at?: string
          used?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "staff_leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leave_balances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type_id: string | null
          reason: string | null
          restaurant_id: string
          staff_id: string
          start_date: string
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          restaurant_id: string
          staff_id: string
          start_date: string
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          restaurant_id?: string
          staff_id?: string
          start_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "staff_leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leave_requests_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leave_types: {
        Row: {
          created_at: string
          days_per_year: number | null
          id: string
          is_paid: boolean | null
          name: string
          requires_approval: boolean | null
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          days_per_year?: number | null
          id?: string
          is_paid?: boolean | null
          name: string
          requires_approval?: boolean | null
          restaurant_id: string
        }
        Update: {
          created_at?: string
          days_per_year?: number | null
          id?: string
          is_paid?: boolean | null
          name?: string
          requires_approval?: boolean | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leave_types_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leaves: {
        Row: {
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          restaurant_id: string
          staff_id: string
          start_date: string
          status: string | null
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          restaurant_id: string
          staff_id: string
          start_date: string
          status?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          restaurant_id?: string
          staff_id?: string
          start_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_leaves_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          restaurant_id: string
          staff_id: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          restaurant_id: string
          staff_id?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          restaurant_id?: string
          staff_id?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_notifications_staff_id_fkey"
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
        Relationships: [
          {
            foreignKeyName: "staff_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shift_assignments: {
        Row: {
          assigned_date: string
          created_at: string
          id: string
          restaurant_id: string
          shift_id: string
          staff_id: string
          status: string | null
        }
        Insert: {
          assigned_date: string
          created_at?: string
          id?: string
          restaurant_id: string
          shift_id: string
          staff_id: string
          status?: string | null
        }
        Update: {
          assigned_date?: string
          created_at?: string
          id?: string
          restaurant_id?: string
          shift_id?: string
          staff_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_shift_assignments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "staff_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string
          days_of_week: Json | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          restaurant_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          days_of_week?: Json | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          restaurant_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          days_of_week?: Json | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          restaurant_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_time_clock: {
        Row: {
          break_duration: number | null
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          restaurant_id: string
          staff_id: string
          status: string | null
        }
        Insert: {
          break_duration?: number | null
          clock_in: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id: string
          staff_id: string
          status?: string | null
        }
        Update: {
          break_duration?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id?: string
          staff_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_time_clock_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_clock_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          components: string[] | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          interval: Database["public"]["Enums"]["subscription_interval"]
          is_active: boolean | null
          max_rooms: number | null
          max_tables: number | null
          max_users: number | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          components?: string[] | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: Database["public"]["Enums"]["subscription_interval"]
          is_active?: boolean | null
          max_rooms?: number | null
          max_tables?: number | null
          max_users?: number | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          components?: string[] | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: Database["public"]["Enums"]["subscription_interval"]
          is_active?: boolean | null
          max_rooms?: number | null
          max_tables?: number | null
          max_users?: number | null
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
          inventory_item_id: string | null
          quantity: number
          supplier_order_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          quantity: number
          supplier_order_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          quantity?: number
          supplier_order_id?: string
          total_price?: number
          unit_price?: number
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
            foreignKeyName: "supplier_order_items_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
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
          bank_details: Json | null
          contact_person: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_details?: Json | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_details?: Json | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
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
          id: string
          is_available: boolean | null
          reservation_id: string | null
          restaurant_id: string
          slot_date: string
          slot_time: string
          table_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean | null
          reservation_id?: string | null
          restaurant_id: string
          slot_date: string
          slot_time: string
          table_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean | null
          reservation_id?: string | null
          restaurant_id?: string
          slot_date?: string
          slot_time?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_availability_slots_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "table_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_availability_slots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
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
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          party_size: number
          reservation_date: string
          reservation_time: string
          restaurant_id: string
          special_requests: string | null
          status: string | null
          table_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date: string
          reservation_time: string
          restaurant_id: string
          special_requests?: string | null
          status?: string | null
          table_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          restaurant_id?: string
          special_requests?: string | null
          status?: string | null
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_reservations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_configurations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          restaurant_id: string
          tax_name: string
          tax_rate: number
          tax_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          restaurant_id: string
          tax_name: string
          tax_rate: number
          tax_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          restaurant_id?: string
          tax_name?: string
          tax_rate?: number
          tax_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_configurations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          check_in_time: string | null
          created_at: string
          customer_name: string
          customer_phone: string | null
          estimated_wait_minutes: number | null
          id: string
          notes: string | null
          party_size: number
          restaurant_id: string
          seated_at: string | null
          status: string | null
          table_id: string | null
        }
        Insert: {
          check_in_time?: string | null
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          notes?: string | null
          party_size?: number
          restaurant_id: string
          seated_at?: string | null
          status?: string | null
          table_id?: string | null
        }
        Update: {
          check_in_time?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          notes?: string | null
          party_size?: number
          restaurant_id?: string
          seated_at?: string | null
          status?: string | null
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_loyalty_transactions: {
        Args: { customer_id_param: string }
        Returns: {
          balance_after: number | null
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          restaurant_id: string | null
          transaction_type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "loyalty_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_components: { Args: { p_user_id: string }; Returns: string[] }
      get_user_restaurant: { Args: never; Returns: string }
      has_active_subscription: {
        Args: { restaurant_id: string }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["user_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      recipe_category:
        | "appetizer"
        | "main_course"
        | "dessert"
        | "beverage"
        | "side_dish"
        | "salad"
        | "soup"
        | "breakfast"
        | "snack"
      subscription_interval: "monthly" | "quarterly" | "half_yearly" | "yearly"
      unit_of_measure:
        | "kg"
        | "g"
        | "mg"
        | "l"
        | "ml"
        | "piece"
        | "dozen"
        | "cup"
        | "tbsp"
        | "tsp"
      user_role:
        | "admin"
        | "manager"
        | "owner"
        | "chef"
        | "waiter"
        | "staff"
        | "viewer"
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
  public: {
    Enums: {
      recipe_category: [
        "appetizer",
        "main_course",
        "dessert",
        "beverage",
        "side_dish",
        "salad",
        "soup",
        "breakfast",
        "snack",
      ],
      subscription_interval: ["monthly", "quarterly", "half_yearly", "yearly"],
      unit_of_measure: [
        "kg",
        "g",
        "mg",
        "l",
        "ml",
        "piece",
        "dozen",
        "cup",
        "tbsp",
        "tsp",
      ],
      user_role: [
        "admin",
        "manager",
        "owner",
        "chef",
        "waiter",
        "staff",
        "viewer",
      ],
    },
  },
} as const
