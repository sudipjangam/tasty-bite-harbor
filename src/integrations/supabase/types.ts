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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      app_components: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
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
          restaurant_id: string
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
          restaurant_id: string
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
          restaurant_id?: string
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backup_settings: {
        Row: {
          auto_backup_enabled: boolean
          backup_frequency: string
          backup_location: string
          created_at: string
          id: string
          restaurant_id: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          auto_backup_enabled?: boolean
          backup_frequency?: string
          backup_location?: string
          created_at?: string
          id?: string
          restaurant_id: string
          retention_days?: number
          updated_at?: string
        }
        Update: {
          auto_backup_enabled?: boolean
          backup_frequency?: string
          backup_location?: string
          created_at?: string
          id?: string
          restaurant_id?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          file_path: string | null
          file_size: number | null
          id: string
          restaurant_id: string
          status: string | null
        }
        Insert: {
          backup_type: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          restaurant_id: string
          status?: string | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          restaurant_id?: string
          status?: string | null
        }
        Relationships: []
      }
      batch_productions: {
        Row: {
          batch_size: number
          completed_at: string | null
          cost_per_unit: number | null
          created_at: string
          id: string
          notes: string | null
          produced_by: string | null
          production_date: string
          recipe_id: string
          restaurant_id: string
          started_at: string | null
          status: string | null
          total_cost: number | null
          updated_at: string
          waste_amount: number | null
          waste_reason: string | null
          yield_actual: number | null
          yield_expected: number | null
          yield_percentage: number | null
        }
        Insert: {
          batch_size: number
          completed_at?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          produced_by?: string | null
          production_date?: string
          recipe_id: string
          restaurant_id: string
          started_at?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string
          waste_amount?: number | null
          waste_reason?: string | null
          yield_actual?: number | null
          yield_expected?: number | null
          yield_percentage?: number | null
        }
        Update: {
          batch_size?: number
          completed_at?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          produced_by?: string | null
          production_date?: string
          recipe_id?: string
          restaurant_id?: string
          started_at?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string
          waste_amount?: number | null
          waste_reason?: string | null
          yield_actual?: number | null
          yield_expected?: number | null
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_productions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
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
        Relationships: []
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
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
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
            foreignKeyName: "channel_inventory_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_rate_rules: {
        Row: {
          applies_to_dates: unknown
          channel_id: string
          created_at: string | null
          days_of_week: number[] | null
          id: string
          is_active: boolean | null
          is_percentage: boolean | null
          max_price: number | null
          min_price: number | null
          priority: number | null
          rate_plan_id: string | null
          restaurant_id: string
          rule_name: string
          rule_type: string
          updated_at: string | null
          value: number
        }
        Insert: {
          applies_to_dates?: unknown
          channel_id: string
          created_at?: string | null
          days_of_week?: number[] | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          max_price?: number | null
          min_price?: number | null
          priority?: number | null
          rate_plan_id?: string | null
          restaurant_id: string
          rule_name: string
          rule_type: string
          updated_at?: string | null
          value: number
        }
        Update: {
          applies_to_dates?: unknown
          channel_id?: string
          created_at?: string | null
          days_of_week?: number[] | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          max_price?: number | null
          min_price?: number | null
          priority?: number | null
          rate_plan_id?: string | null
          restaurant_id?: string
          rule_name?: string
          rule_type?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_rate_rules_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "booking_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_rate_rules_rate_plan_id_fkey"
            columns: ["rate_plan_id"]
            isOneToOne: false
            referencedRelation: "rate_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_rate_rules_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_restrictions: {
        Row: {
          channel_id: string | null
          created_at: string | null
          date_from: string
          date_to: string
          id: string
          is_active: boolean | null
          restaurant_id: string
          restriction_type: string
          room_type: string | null
          updated_at: string | null
          value: Json
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          date_from: string
          date_to: string
          id?: string
          is_active?: boolean | null
          restaurant_id: string
          restriction_type: string
          room_type?: string | null
          updated_at?: string | null
          value?: Json
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          date_from?: string
          date_to?: string
          id?: string
          is_active?: boolean | null
          restaurant_id?: string
          restriction_type?: string
          room_type?: string | null
          updated_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "channel_restrictions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "booking_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_restrictions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_room_mapping: {
        Row: {
          channel_id: string
          created_at: string | null
          hms_room_type: string
          hms_room_type_id: string | null
          id: string
          is_mapped: boolean | null
          mapping_notes: string | null
          max_occupancy: number | null
          ota_rate_plan_id: string
          ota_room_name: string | null
          ota_room_type_id: string
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          hms_room_type: string
          hms_room_type_id?: string | null
          id?: string
          is_mapped?: boolean | null
          mapping_notes?: string | null
          max_occupancy?: number | null
          ota_rate_plan_id: string
          ota_room_name?: string | null
          ota_room_type_id: string
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          hms_room_type?: string
          hms_room_type_id?: string | null
          id?: string
          is_mapped?: boolean | null
          mapping_notes?: string | null
          max_occupancy?: number | null
          ota_rate_plan_id?: string
          ota_room_name?: string | null
          ota_room_type_id?: string
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_room_mapping_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "booking_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_room_mapping_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
        Relationships: []
      }
      component_permissions: {
        Row: {
          component_id: string
          created_at: string | null
          description: string | null
          id: string
          permission: string
        }
        Insert: {
          component_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          permission: string
        }
        Update: {
          component_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_permissions_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "app_components"
            referencedColumns: ["id"]
          },
        ]
      }
      component_table_mapping: {
        Row: {
          component_id: string | null
          created_at: string | null
          id: string
          table_name: string
        }
        Insert: {
          component_id?: string | null
          created_at?: string | null
          id?: string
          table_name: string
        }
        Update: {
          component_id?: string | null
          created_at?: string | null
          id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_table_mapping_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "app_components"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          commonly_used_in: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          commonly_used_in?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          commonly_used_in?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          symbol?: string
          updated_at?: string
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
      customer_order_sessions: {
        Row: {
          cart_items: Json | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          payment_amount: number | null
          payment_intent_id: string | null
          payment_status: string | null
          qr_code_id: string | null
          restaurant_id: string
          session_token: string
          special_instructions: string | null
          updated_at: string | null
        }
        Insert: {
          cart_items?: Json | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          payment_amount?: number | null
          payment_intent_id?: string | null
          payment_status?: string | null
          qr_code_id?: string | null
          restaurant_id: string
          session_token: string
          special_instructions?: string | null
          updated_at?: string | null
        }
        Update: {
          cart_items?: Json | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          payment_amount?: number | null
          payment_intent_id?: string | null
          payment_status?: string | null
          qr_code_id?: string | null
          restaurant_id?: string
          session_token?: string
          special_instructions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_order_sessions_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_sessions_restaurant_id_fkey"
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
      daily_summary_reports: {
        Row: {
          average_order_value: number | null
          created_at: string | null
          discount_amount: number | null
          generated_at: string | null
          generated_by: string | null
          id: string
          nc_amount: number | null
          nc_orders: number | null
          notes: string | null
          order_type_breakdown: Json | null
          payment_breakdown: Json | null
          peak_hour: string | null
          report_date: string
          restaurant_id: string
          top_items: Json | null
          total_items_sold: number | null
          total_orders: number | null
          total_revenue: number | null
        }
        Insert: {
          average_order_value?: number | null
          created_at?: string | null
          discount_amount?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          nc_amount?: number | null
          nc_orders?: number | null
          notes?: string | null
          order_type_breakdown?: Json | null
          payment_breakdown?: Json | null
          peak_hour?: string | null
          report_date: string
          restaurant_id: string
          top_items?: Json | null
          total_items_sold?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Update: {
          average_order_value?: number | null
          created_at?: string | null
          discount_amount?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          nc_amount?: number | null
          nc_orders?: number | null
          notes?: string | null
          order_type_breakdown?: Json | null
          payment_breakdown?: Json | null
          peak_hour?: string | null
          report_date?: string
          restaurant_id?: string
          top_items?: Json | null
          total_items_sold?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_summary_reports_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          restaurant_id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          restaurant_id: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_restaurant_id_fkey"
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
        Relationships: []
      }
      guest_feedback: {
        Row: {
          assigned_to: string | null
          comment: string | null
          created_at: string
          feedback_type: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          is_complaint: boolean | null
          rating: number
          reservation_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          restaurant_id: string
          room_id: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          comment?: string | null
          created_at?: string
          feedback_type: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          is_complaint?: boolean | null
          rating: number
          reservation_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          restaurant_id: string
          room_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          comment?: string | null
          created_at?: string
          feedback_type?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          is_complaint?: boolean | null
          rating?: number
          reservation_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          restaurant_id?: string
          room_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_feedback_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
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
          {
            foreignKeyName: "guest_feedback_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_loyalty: {
        Row: {
          created_at: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string
          id: string
          last_stay_date: string | null
          notes: string | null
          restaurant_id: string
          tier: string | null
          total_spent: number | null
          total_stays: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone: string
          id?: string
          last_stay_date?: string | null
          notes?: string | null
          restaurant_id: string
          tier?: string | null
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string
          id?: string
          last_stay_date?: string | null
          notes?: string | null
          restaurant_id?: string
          tier?: string | null
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_loyalty_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_preferences: {
        Row: {
          created_at: string
          food_preferences: Json | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          last_stay: string | null
          notes: string | null
          restaurant_id: string
          room_preferences: Json | null
          service_preferences: Json | null
          special_occasions: Json | null
          total_stays: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          food_preferences?: Json | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          last_stay?: string | null
          notes?: string | null
          restaurant_id: string
          room_preferences?: Json | null
          service_preferences?: Json | null
          special_occasions?: Json | null
          total_stays?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          food_preferences?: Json | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          last_stay?: string | null
          notes?: string | null
          restaurant_id?: string
          room_preferences?: Json | null
          service_preferences?: Json | null
          special_occasions?: Json | null
          total_stays?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_preferences_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
        Relationships: []
      }
      homemade_production_log_items: {
        Row: {
          cost_per_unit: number
          id: string
          inventory_item_id: string
          production_log_id: string
          quantity_consumed: number
          total_cost: number
          unit: string
        }
        Insert: {
          cost_per_unit?: number
          id?: string
          inventory_item_id: string
          production_log_id: string
          quantity_consumed: number
          total_cost?: number
          unit: string
        }
        Update: {
          cost_per_unit?: number
          id?: string
          inventory_item_id?: string
          production_log_id?: string
          quantity_consumed?: number
          total_cost?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "homemade_production_log_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homemade_production_log_items_production_log_id_fkey"
            columns: ["production_log_id"]
            isOneToOne: false
            referencedRelation: "homemade_production_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      homemade_production_logs: {
        Row: {
          cost_per_unit: number
          created_at: string | null
          id: string
          notes: string | null
          output_inventory_item_id: string
          output_quantity: number
          output_unit: string
          produced_at: string | null
          produced_by: string | null
          restaurant_id: string
          total_cost: number
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          output_inventory_item_id: string
          output_quantity: number
          output_unit: string
          produced_at?: string | null
          produced_by?: string | null
          restaurant_id: string
          total_cost?: number
        }
        Update: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          output_inventory_item_id?: string
          output_quantity?: number
          output_unit?: string
          produced_at?: string | null
          produced_by?: string | null
          restaurant_id?: string
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "homemade_production_logs_output_inventory_item_id_fkey"
            columns: ["output_inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homemade_production_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
          is_produced: boolean | null
          name: string
          notification_sent: boolean | null
          quantity: number
          reorder_level: number | null
          restaurant_id: string
          storage_location_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_produced?: boolean | null
          name: string
          notification_sent?: boolean | null
          quantity?: number
          reorder_level?: number | null
          restaurant_id: string
          storage_location_id?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_produced?: boolean | null
          name?: string
          notification_sent?: boolean | null
          quantity?: number
          reorder_level?: number | null
          restaurant_id?: string
          storage_location_id?: string | null
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
          {
            foreignKeyName: "inventory_items_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lots: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          id: string
          inventory_item_id: string
          lot_number: string | null
          notes: string | null
          purchase_date: string
          purchase_order_id: string | null
          quantity_purchased: number
          quantity_remaining: number
          restaurant_id: string
          supplier_id: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inventory_item_id: string
          lot_number?: string | null
          notes?: string | null
          purchase_date?: string
          purchase_order_id?: string | null
          quantity_purchased: number
          quantity_remaining: number
          restaurant_id: string
          supplier_id?: string | null
          unit_cost?: number
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inventory_item_id?: string
          lot_number?: string | null
          notes?: string | null
          purchase_date?: string
          purchase_order_id?: string | null
          quantity_purchased?: number
          quantity_remaining?: number
          restaurant_id?: string
          supplier_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          lot_id: string | null
          notes: string | null
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          restaurant_id: string
          total_cost: number | null
          transaction_type: string
          unit_cost_at_time: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          lot_id?: string | null
          notes?: string | null
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id: string
          total_cost?: number | null
          transaction_type: string
          unit_cost_at_time?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          lot_id?: string | null
          notes?: string | null
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string
          total_cost?: number | null
          transaction_type?: string
          unit_cost_at_time?: number | null
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
            foreignKeyName: "inventory_transactions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          cgst_amount: number | null
          created_at: string
          description: string
          hsn_code: string | null
          id: string
          igst_amount: number | null
          invoice_id: string
          quantity: number
          sgst_amount: number | null
          tax_rate: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          cgst_amount?: number | null
          created_at?: string
          description: string
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id: string
          quantity?: number
          sgst_amount?: number | null
          tax_rate?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          cgst_amount?: number | null
          created_at?: string
          description?: string
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id?: string
          quantity?: number
          sgst_amount?: number | null
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
          customer_gstin: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          is_b2b: boolean | null
          notes: string | null
          paid_amount: number
          payment_terms: string | null
          place_of_supply: string | null
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
          customer_gstin?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          is_b2b?: boolean | null
          notes?: string | null
          paid_amount?: number
          payment_terms?: string | null
          place_of_supply?: string | null
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
          customer_gstin?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_b2b?: boolean | null
          notes?: string | null
          paid_amount?: number
          payment_terms?: string | null
          place_of_supply?: string | null
          restaurant_id?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
          bumped_at: string | null
          completed_at: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          estimated_prep_time: number | null
          id: string
          item_completion_status: Json | null
          items: Json
          nc_reason: string | null
          order_id: string | null
          order_type: string | null
          priority: string | null
          restaurant_id: string | null
          server_name: string | null
          source: string
          started_at: string | null
          station: string | null
          status: string
          table_number: string | null
          updated_at: string
        }
        Insert: {
          bumped_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          estimated_prep_time?: number | null
          id?: string
          item_completion_status?: Json | null
          items: Json
          nc_reason?: string | null
          order_id?: string | null
          order_type?: string | null
          priority?: string | null
          restaurant_id?: string | null
          server_name?: string | null
          source: string
          started_at?: string | null
          station?: string | null
          status?: string
          table_number?: string | null
          updated_at?: string
        }
        Update: {
          bumped_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          estimated_prep_time?: number | null
          id?: string
          item_completion_status?: Json | null
          items?: Json
          nc_reason?: string | null
          order_id?: string | null
          order_type?: string | null
          priority?: string | null
          restaurant_id?: string | null
          server_name?: string | null
          source?: string
          started_at?: string | null
          station?: string | null
          status?: string
          table_number?: string | null
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
            foreignKeyName: "kitchen_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "unified_orders"
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
      lost_found_items: {
        Row: {
          category: string | null
          claimed_by: string | null
          claimed_date: string | null
          created_at: string | null
          description: string | null
          found_by: string | null
          found_date: string
          found_location: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          image_url: string | null
          item_name: string
          notes: string | null
          restaurant_id: string
          room_id: string | null
          status: string | null
          storage_location: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          claimed_by?: string | null
          claimed_date?: string | null
          created_at?: string | null
          description?: string | null
          found_by?: string | null
          found_date: string
          found_location?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          image_url?: string | null
          item_name: string
          notes?: string | null
          restaurant_id: string
          room_id?: string | null
          status?: string | null
          storage_location?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          claimed_by?: string | null
          claimed_date?: string | null
          created_at?: string | null
          description?: string | null
          found_by?: string | null
          found_date?: string
          found_location?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          image_url?: string | null
          item_name?: string
          notes?: string | null
          restaurant_id?: string
          room_id?: string | null
          status?: string | null
          storage_location?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_items_found_by_fkey"
            columns: ["found_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_items_found_by_fkey"
            columns: ["found_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_role"
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
            foreignKeyName: "loyalty_enrollments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_role"
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
          amount_per_point: number
          created_at: string
          free_order_interval: number | null
          id: string
          is_enabled: boolean | null
          max_redemption_percentage: number | null
          points_expiry_days: number | null
          points_per_amount: number
          restaurant_id: string
          spend_threshold: number
          updated_at: string
        }
        Insert: {
          amount_per_point?: number
          created_at?: string
          free_order_interval?: number | null
          id?: string
          is_enabled?: boolean | null
          max_redemption_percentage?: number | null
          points_expiry_days?: number | null
          points_per_amount?: number
          restaurant_id: string
          spend_threshold?: number
          updated_at?: string
        }
        Update: {
          amount_per_point?: number
          created_at?: string
          free_order_interval?: number | null
          id?: string
          is_enabled?: boolean | null
          max_redemption_percentage?: number | null
          points_expiry_days?: number | null
          points_per_amount?: number
          restaurant_id?: string
          spend_threshold?: number
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
            foreignKeyName: "loyalty_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "unified_orders"
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
          color: string | null
          created_at: string
          display_order: number
          id: string
          min_spent: number | null
          min_visits: number | null
          name: string
          points_multiplier: number | null
          points_required: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          benefits?: Json | null
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          min_spent?: number | null
          min_visits?: number | null
          name: string
          points_multiplier?: number | null
          points_required: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          benefits?: Json | null
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          min_spent?: number | null
          min_visits?: number | null
          name?: string
          points_multiplier?: number | null
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
      menu_item_variants: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          menu_item_id: string
          name: string
          price: number
          restaurant_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          menu_item_id: string
          name: string
          price: number
          restaurant_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          menu_item_id?: string
          name?: string
          price?: number
          restaurant_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_variants_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_variants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          base_unit_quantity: number | null
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
          pricing_type: string | null
          pricing_unit: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          base_unit_quantity?: number | null
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
          pricing_type?: string | null
          pricing_unit?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          base_unit_quantity?: number | null
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
          pricing_type?: string | null
          pricing_unit?: string | null
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
      night_audit_logs: {
        Row: {
          audit_date: string
          completed_at: string | null
          created_at: string | null
          discrepancies: Json | null
          food_revenue: number | null
          id: string
          notes: string | null
          other_revenue: number | null
          performed_by: string | null
          restaurant_id: string
          room_revenue: number | null
          rooms_charged: number | null
          status: string | null
          total_check_ins: number | null
          total_check_outs: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          audit_date: string
          completed_at?: string | null
          created_at?: string | null
          discrepancies?: Json | null
          food_revenue?: number | null
          id?: string
          notes?: string | null
          other_revenue?: number | null
          performed_by?: string | null
          restaurant_id: string
          room_revenue?: number | null
          rooms_charged?: number | null
          status?: string | null
          total_check_ins?: number | null
          total_check_outs?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          audit_date?: string
          completed_at?: string | null
          created_at?: string | null
          discrepancies?: Json | null
          food_revenue?: number | null
          id?: string
          notes?: string | null
          other_revenue?: number | null
          performed_by?: string | null
          restaurant_id?: string
          room_revenue?: number | null
          rooms_charged?: number | null
          status?: string | null
          total_check_ins?: number | null
          total_check_outs?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "night_audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "night_audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_role"
            referencedColumns: ["id"]
          },
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
          cost_date: string | null
          cost_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_recurring: boolean | null
          recurring_frequency: string | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          cost_date?: string | null
          cost_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          recurring_frequency?: string | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          cost_date?: string | null
          cost_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          recurring_frequency?: string | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          attendant: string | null
          created_at: string
          Customer_MobileNumber: string | null
          customer_name: string
          Customer_Name: string | null
          customer_phone: string | null
          discount_amount: number | null
          discount_notes: string | null
          discount_percentage: number | null
          entity_name: string | null
          id: string
          is_qr_order: boolean | null
          item_completion_status: boolean[] | null
          items: string[]
          nc_reason: string | null
          order_number: number | null
          order_type: string | null
          original_subtotal: number | null
          payment_intent_id: string | null
          payment_method: string | null
          payment_status: string | null
          priority: string | null
          qr_session_id: string | null
          reservation_id: string | null
          restaurant_id: string
          room_id: string | null
          source: string | null
          status: string
          table_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          attendant?: string | null
          created_at?: string
          Customer_MobileNumber?: string | null
          customer_name: string
          Customer_Name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          discount_notes?: string | null
          discount_percentage?: number | null
          entity_name?: string | null
          id?: string
          is_qr_order?: boolean | null
          item_completion_status?: boolean[] | null
          items: string[]
          nc_reason?: string | null
          order_number?: number | null
          order_type?: string | null
          original_subtotal?: number | null
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          priority?: string | null
          qr_session_id?: string | null
          reservation_id?: string | null
          restaurant_id: string
          room_id?: string | null
          source?: string | null
          status?: string
          table_id?: string | null
          total: number
          updated_at?: string
        }
        Update: {
          attendant?: string | null
          created_at?: string
          Customer_MobileNumber?: string | null
          customer_name?: string
          Customer_Name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          discount_notes?: string | null
          discount_percentage?: number | null
          entity_name?: string | null
          id?: string
          is_qr_order?: boolean | null
          item_completion_status?: boolean[] | null
          items?: string[]
          nc_reason?: string | null
          order_number?: number | null
          order_type?: string | null
          original_subtotal?: number | null
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          priority?: string | null
          qr_session_id?: string | null
          reservation_id?: string | null
          restaurant_id?: string
          room_id?: string | null
          source?: string | null
          status?: string
          table_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_qr_session_id_fkey"
            columns: ["qr_session_id"]
            isOneToOne: false
            referencedRelation: "customer_order_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
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
            foreignKeyName: "orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_unified: {
        Row: {
          cgst_amount: number | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_notes: string | null
          discount_amount: number | null
          discount_percentage: number | null
          estimated_time: number | null
          id: string
          igst_amount: number | null
          items: Json
          items_completion: Json | null
          kitchen_status: string | null
          order_number: string | null
          order_type: string | null
          payment_method: string | null
          payment_status: string | null
          priority: number | null
          reservation_id: string | null
          restaurant_id: string
          server_name: string | null
          sgst_amount: number | null
          source: string | null
          started_at: string | null
          station: string | null
          status: string | null
          subtotal: number | null
          table_id: string | null
          table_number: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string
          waiter_id: string | null
        }
        Insert: {
          cgst_amount?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          estimated_time?: number | null
          id?: string
          igst_amount?: number | null
          items?: Json
          items_completion?: Json | null
          kitchen_status?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          priority?: number | null
          reservation_id?: string | null
          restaurant_id: string
          server_name?: string | null
          sgst_amount?: number | null
          source?: string | null
          started_at?: string | null
          station?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          waiter_id?: string | null
        }
        Update: {
          cgst_amount?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          estimated_time?: number | null
          id?: string
          igst_amount?: number | null
          items?: Json
          items_completion?: Json | null
          kitchen_status?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          priority?: number | null
          reservation_id?: string | null
          restaurant_id?: string
          server_name?: string | null
          sgst_amount?: number | null
          source?: string | null
          started_at?: string | null
          station?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_unified_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_unified_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_unified_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_unified_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_unified_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_unified_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_unified_backup_20260111_000000: {
        Row: {
          cgst_amount: number | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_notes: string | null
          discount_amount: number | null
          discount_percentage: number | null
          estimated_time: number | null
          id: string | null
          igst_amount: number | null
          items: Json | null
          items_completion: Json | null
          kitchen_status: string | null
          order_number: string | null
          order_type: string | null
          payment_method: string | null
          payment_status: string | null
          priority: number | null
          reservation_id: string | null
          restaurant_id: string | null
          server_name: string | null
          sgst_amount: number | null
          source: string | null
          started_at: string | null
          station: string | null
          status: string | null
          subtotal: number | null
          table_id: string | null
          table_number: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          waiter_id: string | null
        }
        Insert: {
          cgst_amount?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          estimated_time?: number | null
          id?: string | null
          igst_amount?: number | null
          items?: Json | null
          items_completion?: Json | null
          kitchen_status?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          priority?: number | null
          reservation_id?: string | null
          restaurant_id?: string | null
          server_name?: string | null
          sgst_amount?: number | null
          source?: string | null
          started_at?: string | null
          station?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          waiter_id?: string | null
        }
        Update: {
          cgst_amount?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          estimated_time?: number | null
          id?: string | null
          igst_amount?: number | null
          items?: Json | null
          items_completion?: Json | null
          kitchen_status?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          priority?: number | null
          reservation_id?: string | null
          restaurant_id?: string | null
          server_name?: string | null
          sgst_amount?: number | null
          source?: string | null
          started_at?: string | null
          station?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          waiter_id?: string | null
        }
        Relationships: []
      }
      ota_bookings: {
        Row: {
          adults: number | null
          booking_status: string | null
          channel_id: string
          check_in: string
          check_out: string
          children: number | null
          commission_amount: number | null
          created_at: string | null
          currency: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          inventory_decremented: boolean | null
          net_amount: number | null
          ota_booking_id: string
          ota_name: string
          payment_mode: string | null
          payment_status: string | null
          pms_reservation_id: string | null
          raw_payload: Json | null
          restaurant_id: string
          room_count: number | null
          room_type: string
          special_requests: string | null
          synced_to_pms: boolean | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          adults?: number | null
          booking_status?: string | null
          channel_id: string
          check_in: string
          check_out: string
          children?: number | null
          commission_amount?: number | null
          created_at?: string | null
          currency?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          inventory_decremented?: boolean | null
          net_amount?: number | null
          ota_booking_id: string
          ota_name: string
          payment_mode?: string | null
          payment_status?: string | null
          pms_reservation_id?: string | null
          raw_payload?: Json | null
          restaurant_id: string
          room_count?: number | null
          room_type: string
          special_requests?: string | null
          synced_to_pms?: boolean | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          adults?: number | null
          booking_status?: string | null
          channel_id?: string
          check_in?: string
          check_out?: string
          children?: number | null
          commission_amount?: number | null
          created_at?: string | null
          currency?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          inventory_decremented?: boolean | null
          net_amount?: number | null
          ota_booking_id?: string
          ota_name?: string
          payment_mode?: string | null
          payment_status?: string | null
          pms_reservation_id?: string | null
          raw_payload?: Json | null
          restaurant_id?: string
          room_count?: number | null
          room_type?: string
          special_requests?: string | null
          synced_to_pms?: boolean | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ota_bookings_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "booking_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ota_bookings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ota_credentials: {
        Row: {
          access_token: string | null
          api_endpoint: string | null
          auth_type: string
          channel_id: string | null
          connection_status: string | null
          created_at: string | null
          extra_config: Json | null
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          ota_name: string
          password_encrypted: string | null
          refresh_token: string | null
          restaurant_id: string
          token_expiry: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          access_token?: string | null
          api_endpoint?: string | null
          auth_type?: string
          channel_id?: string | null
          connection_status?: string | null
          created_at?: string | null
          extra_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          ota_name: string
          password_encrypted?: string | null
          refresh_token?: string | null
          restaurant_id: string
          token_expiry?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          access_token?: string | null
          api_endpoint?: string | null
          auth_type?: string
          channel_id?: string | null
          connection_status?: string | null
          created_at?: string | null
          extra_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          ota_name?: string
          password_encrypted?: string | null
          refresh_token?: string | null
          restaurant_id?: string
          token_expiry?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ota_credentials_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "booking_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ota_credentials_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          restaurant_id: string
          staff_name: string
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          restaurant_id: string
          staff_name?: string
          title: string
          type: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          restaurant_id?: string
          staff_name?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          processing_fee_percentage: number | null
          restaurant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          processing_fee_percentage?: number | null
          restaurant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          processing_fee_percentage?: number | null
          restaurant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          created_at: string
          gateway_type: string | null
          id: string
          is_active: boolean | null
          paytm_merchant_key: string | null
          paytm_mid: string | null
          paytm_test_mode: boolean | null
          paytm_webhook_secret: string | null
          paytm_website: string | null
          restaurant_id: string
          soundbox_enabled: boolean | null
          updated_at: string
          upi_id: string
          upi_name: string | null
          voice_announcement_enabled: boolean | null
          voice_announcement_language: string | null
          voice_announcement_template: string | null
        }
        Insert: {
          created_at?: string
          gateway_type?: string | null
          id?: string
          is_active?: boolean | null
          paytm_merchant_key?: string | null
          paytm_mid?: string | null
          paytm_test_mode?: boolean | null
          paytm_webhook_secret?: string | null
          paytm_website?: string | null
          restaurant_id: string
          soundbox_enabled?: boolean | null
          updated_at?: string
          upi_id: string
          upi_name?: string | null
          voice_announcement_enabled?: boolean | null
          voice_announcement_language?: string | null
          voice_announcement_template?: string | null
        }
        Update: {
          created_at?: string
          gateway_type?: string | null
          id?: string
          is_active?: boolean | null
          paytm_merchant_key?: string | null
          paytm_mid?: string | null
          paytm_test_mode?: boolean | null
          paytm_webhook_secret?: string | null
          paytm_website?: string | null
          restaurant_id?: string
          soundbox_enabled?: boolean | null
          updated_at?: string
          upi_id?: string
          upi_name?: string | null
          voice_announcement_enabled?: boolean | null
          voice_announcement_language?: string | null
          voice_announcement_template?: string | null
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
      payment_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string | null
          expires_at: string | null
          gateway_type: string | null
          id: string
          order_id: string | null
          paytm_order_id: string
          paytm_qr_id: string | null
          paytm_txn_id: string | null
          qr_code_data: string | null
          qr_image_base64: string | null
          restaurant_id: string
          status: string | null
          table_number: string | null
          webhook_payload: Json | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          gateway_type?: string | null
          id?: string
          order_id?: string | null
          paytm_order_id: string
          paytm_qr_id?: string | null
          paytm_txn_id?: string | null
          qr_code_data?: string | null
          qr_image_base64?: string | null
          restaurant_id: string
          status?: string | null
          table_number?: string | null
          webhook_payload?: Json | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          gateway_type?: string | null
          id?: string
          order_id?: string | null
          paytm_order_id?: string
          paytm_qr_id?: string | null
          paytm_txn_id?: string | null
          qr_code_data?: string | null
          qr_image_base64?: string | null
          restaurant_id?: string
          status?: string | null
          table_number?: string | null
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
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
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      pool_inventory: {
        Row: {
          available_count: number
          blocked_count: number | null
          buffer_count: number | null
          created_at: string | null
          date: string
          id: string
          last_synced_at: string | null
          restaurant_id: string
          room_type: string
          total_count: number
          updated_at: string | null
        }
        Insert: {
          available_count?: number
          blocked_count?: number | null
          buffer_count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          last_synced_at?: string | null
          restaurant_id: string
          room_type: string
          total_count?: number
          updated_at?: string | null
        }
        Update: {
          available_count?: number
          blocked_count?: number | null
          buffer_count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          last_synced_at?: string | null
          restaurant_id?: string
          room_type?: string
          total_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pool_inventory_restaurant_id_fkey"
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
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          id: string
          kitchen_order_id: string | null
          notes: string | null
          order_id: string | null
          payment_method: string
          promotion_id: string | null
          restaurant_id: string
          staff_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          kitchen_order_id?: string | null
          notes?: string | null
          order_id?: string | null
          payment_method: string
          promotion_id?: string | null
          restaurant_id: string
          staff_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          kitchen_order_id?: string | null
          notes?: string | null
          order_id?: string | null
          payment_method?: string
          promotion_id?: string | null
          restaurant_id?: string
          staff_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_kitchen_order_id_fkey"
            columns: ["kitchen_order_id"]
            isOneToOne: false
            referencedRelation: "kitchen_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_kitchen_order_id_fkey"
            columns: ["kitchen_order_id"]
            isOneToOne: false
            referencedRelation: "unified_orders"
            referencedColumns: ["kitchen_order_id"]
          },
          {
            foreignKeyName: "pos_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "unified_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_role"
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
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
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
          phone?: string | null
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
          phone?: string | null
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
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
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
          expiry_date: string | null
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
          expiry_date?: string | null
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
          expiry_date?: string | null
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
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_active: boolean | null
          qr_code_data: string
          qr_code_url: string | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_active?: boolean | null
          qr_code_data: string
          qr_code_url?: string | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_active?: boolean | null
          qr_code_data?: string
          qr_code_url?: string | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_parity_checks: {
        Row: {
          base_rate: number | null
          channel_rates: Json
          check_date: string
          created_at: string | null
          flagged_channels: Json | null
          id: string
          max_deviation_percent: number | null
          parity_status: string | null
          restaurant_id: string
          room_type: string
        }
        Insert: {
          base_rate?: number | null
          channel_rates: Json
          check_date: string
          created_at?: string | null
          flagged_channels?: Json | null
          id?: string
          max_deviation_percent?: number | null
          parity_status?: string | null
          restaurant_id: string
          room_type: string
        }
        Update: {
          base_rate?: number | null
          channel_rates?: Json
          check_date?: string
          created_at?: string | null
          flagged_channels?: Json | null
          id?: string
          max_deviation_percent?: number | null
          parity_status?: string | null
          restaurant_id?: string
          room_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_parity_checks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          id: string
          inventory_item_id: string
          notes: string | null
          quantity: number
          recipe_id: string
          total_cost: number | null
          unit: Database["public"]["Enums"]["unit_of_measure"]
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity: number
          recipe_id: string
          total_cost?: number | null
          unit: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity?: number
          recipe_id?: string
          total_cost?: number | null
          unit?: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
          variant_id?: string | null
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
          {
            foreignKeyName: "recipe_ingredients_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "menu_item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: Database["public"]["Enums"]["recipe_category"]
          cook_time_minutes: number | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          food_cost_percentage: number | null
          id: string
          image_url: string | null
          instructions: string | null
          is_active: boolean | null
          margin_percentage: number | null
          menu_item_id: string | null
          name: string
          prep_time_minutes: number | null
          restaurant_id: string
          selling_price: number | null
          serving_size: number
          serving_unit: string | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["recipe_category"]
          cook_time_minutes?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          food_cost_percentage?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_active?: boolean | null
          margin_percentage?: number | null
          menu_item_id?: string | null
          name: string
          prep_time_minutes?: number | null
          restaurant_id: string
          selling_price?: number | null
          serving_size?: number
          serving_unit?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["recipe_category"]
          cook_time_minutes?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          food_cost_percentage?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_active?: boolean | null
          margin_percentage?: number | null
          menu_item_id?: string | null
          name?: string
          prep_time_minutes?: number | null
          restaurant_id?: string
          selling_price?: number | null
          serving_size?: number
          serving_unit?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          billing_address: string | null
          company_gst: string | null
          company_name: string | null
          corporate_rate: number | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          end_time: string
          group_id: string | null
          group_name: string | null
          guest_tier: string | null
          id: string
          is_corporate: boolean | null
          is_master_folio: boolean | null
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
          billing_address?: string | null
          company_gst?: string | null
          company_name?: string | null
          corporate_rate?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          end_time: string
          group_id?: string | null
          group_name?: string | null
          guest_tier?: string | null
          id?: string
          is_corporate?: boolean | null
          is_master_folio?: boolean | null
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
          billing_address?: string | null
          company_gst?: string | null
          company_name?: string | null
          corporate_rate?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_time?: string
          group_id?: string | null
          group_name?: string | null
          guest_tier?: string | null
          id?: string
          is_corporate?: boolean | null
          is_master_folio?: boolean | null
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
      restaurant_settings: {
        Row: {
          backup_frequency: string | null
          created_at: string
          currency_id: string | null
          date_format: string | null
          id: string
          restaurant_id: string
          settings: Json | null
          time_format: string | null
          timezone: string | null
          updated_at: string
          whatsapp_meta_config: Json | null
          whatsapp_provider: string
        }
        Insert: {
          backup_frequency?: string | null
          created_at?: string
          currency_id?: string | null
          date_format?: string | null
          id?: string
          restaurant_id: string
          settings?: Json | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp_meta_config?: Json | null
          whatsapp_provider?: string
        }
        Update: {
          backup_frequency?: string | null
          created_at?: string
          currency_id?: string | null
          date_format?: string | null
          id?: string
          restaurant_id?: string
          settings?: Json | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp_meta_config?: Json | null
          whatsapp_provider?: string
        }
        Relationships: []
      }
      restaurant_subscriptions: {
        Row: {
          amount_paid: number | null
          cancel_at_period_end: boolean | null
          created_at: string
          currency: string | null
          current_period_end: string
          current_period_start: string
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_notes: Json | null
          plan_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          receipt: string | null
          refund_amount: number | null
          refund_id: string | null
          refund_status: string | null
          refunded_at: string | null
          restaurant_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          currency?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: Json | null
          plan_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          receipt?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          restaurant_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          currency?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: Json | null
          plan_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          receipt?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refund_status?: string | null
          refunded_at?: string | null
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
          account_number: string | null
          address: string | null
          bank_name: string | null
          created_at: string
          cuisine_types: string[] | null
          current_location: string | null
          current_location_link: string | null
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
          location_type: string | null
          location_updated_at: string | null
          logo_url: string | null
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
          qr_ordering_enabled: boolean | null
          qr_payment_required: boolean | null
          qr_service_charge_percent: number | null
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
          weekly_schedule: Json | null
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          created_at?: string
          cuisine_types?: string[] | null
          current_location?: string | null
          current_location_link?: string | null
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
          location_type?: string | null
          location_updated_at?: string | null
          logo_url?: string | null
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
          qr_ordering_enabled?: boolean | null
          qr_payment_required?: boolean | null
          qr_service_charge_percent?: number | null
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
          weekly_schedule?: Json | null
        }
        Update: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          created_at?: string
          cuisine_types?: string[] | null
          current_location?: string | null
          current_location_link?: string | null
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
          location_type?: string | null
          location_updated_at?: string | null
          logo_url?: string | null
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
          qr_ordering_enabled?: boolean | null
          qr_payment_required?: boolean | null
          qr_service_charge_percent?: number | null
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
          weekly_schedule?: Json | null
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
        Relationships: []
      }
      role_components: {
        Row: {
          component_id: string
          created_at: string | null
          role_id: string
        }
        Insert: {
          component_id: string
          created_at?: string | null
          role_id: string
        }
        Update: {
          component_id?: string
          created_at?: string | null
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
          created_at: string | null
          description: string | null
          has_full_access: boolean | null
          id: string
          is_deletable: boolean | null
          is_system: boolean | null
          name: string
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          has_full_access?: boolean | null
          id?: string
          is_deletable?: boolean | null
          is_system?: boolean | null
          name: string
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          has_full_access?: boolean | null
          id?: string
          is_deletable?: boolean | null
          is_system?: boolean | null
          name?: string
          restaurant_id?: string
          updated_at?: string | null
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
          category: string
          cost_per_unit: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_complimentary: boolean | null
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          category: string
          cost_per_unit?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_complimentary?: boolean | null
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_complimentary?: boolean | null
          name?: string
          restaurant_id?: string
          updated_at?: string
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
          condition: string
          created_at: string
          id: string
          last_checked: string | null
          notes: string | null
          quantity: number
          restaurant_id: string
          room_id: string
          updated_at: string
        }
        Insert: {
          amenity_id: string
          condition?: string
          created_at?: string
          id?: string
          last_checked?: string | null
          notes?: string | null
          quantity?: number
          restaurant_id: string
          room_id: string
          updated_at?: string
        }
        Update: {
          amenity_id?: string
          condition?: string
          created_at?: string
          id?: string
          last_checked?: string | null
          notes?: string | null
          quantity?: number
          restaurant_id?: string
          room_id?: string
          updated_at?: string
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
            foreignKeyName: "room_amenity_inventory_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
          additional_charges: Json
          checkout_date: string
          created_at: string
          customer_name: string
          days_stayed: number
          discount_amount: number | null
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
          discount_amount?: number | null
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
          discount_amount?: number | null
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
      room_cleaning_schedules: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          assigned_staff_id: string | null
          checklist_completed: Json | null
          cleaning_type: string
          created_at: string
          estimated_duration: number
          id: string
          inspected_at: string | null
          inspected_by: string | null
          notes: string | null
          photos: Json | null
          priority: string | null
          reservation_id: string | null
          restaurant_id: string
          room_condition_notes: string | null
          room_id: string
          scheduled_date: string
          scheduled_time: string
          status: string
          trigger_source: string | null
          updated_at: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_staff_id?: string | null
          checklist_completed?: Json | null
          cleaning_type?: string
          created_at?: string
          estimated_duration?: number
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          notes?: string | null
          photos?: Json | null
          priority?: string | null
          reservation_id?: string | null
          restaurant_id: string
          room_condition_notes?: string | null
          room_id: string
          scheduled_date: string
          scheduled_time: string
          status?: string
          trigger_source?: string | null
          updated_at?: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_staff_id?: string | null
          checklist_completed?: Json | null
          cleaning_type?: string
          created_at?: string
          estimated_duration?: number
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          notes?: string | null
          photos?: Json | null
          priority?: string | null
          reservation_id?: string | null
          restaurant_id?: string
          room_condition_notes?: string | null
          room_id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          trigger_source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_cleaning_schedules_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_cleaning_schedules_inspected_by_fkey"
            columns: ["inspected_by"]
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
          customer_name: string
          id: string
          items: Json
          order_id: string | null
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
          order_id?: string | null
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
          order_id?: string | null
          restaurant_id?: string
          room_id?: string
          status?: string
          total?: number
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
            foreignKeyName: "room_food_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "unified_orders"
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
          completed_date: string | null
          created_at: string
          description: string
          estimated_cost: number | null
          id: string
          images: Json | null
          notes: string | null
          priority: string
          reported_by: string | null
          request_type: string
          restaurant_id: string
          room_id: string
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          description: string
          estimated_cost?: number | null
          id?: string
          images?: Json | null
          notes?: string | null
          priority?: string
          reported_by?: string | null
          request_type: string
          restaurant_id: string
          room_id: string
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          images?: Json | null
          notes?: string | null
          priority?: string
          reported_by?: string | null
          request_type?: string
          restaurant_id?: string
          room_id?: string
          scheduled_date?: string | null
          status?: string
          title?: string
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
            foreignKeyName: "room_maintenance_requests_reported_by_fkey"
            columns: ["reported_by"]
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
          check_in_id: string | null
          created_at: string | null
          from_room_id: string | null
          id: string
          is_complimentary: boolean | null
          move_date: string | null
          notes: string | null
          performed_by: string | null
          rate_adjustment: number | null
          reason: string | null
          restaurant_id: string
          to_room_id: string | null
        }
        Insert: {
          check_in_id?: string | null
          created_at?: string | null
          from_room_id?: string | null
          id?: string
          is_complimentary?: boolean | null
          move_date?: string | null
          notes?: string | null
          performed_by?: string | null
          rate_adjustment?: number | null
          reason?: string | null
          restaurant_id: string
          to_room_id?: string | null
        }
        Update: {
          check_in_id?: string | null
          created_at?: string | null
          from_room_id?: string | null
          id?: string
          is_complimentary?: boolean | null
          move_date?: string | null
          notes?: string | null
          performed_by?: string | null
          rate_adjustment?: number | null
          reason?: string | null
          restaurant_id?: string
          to_room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_moves_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_moves_from_room_id_fkey"
            columns: ["from_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_moves_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_moves_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_role"
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
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          guests_count: number | null
          id: string
          notes: string | null
          preferred_room_type: string | null
          priority: number | null
          restaurant_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          check_in_date: string
          check_out_date: string
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          guests_count?: number | null
          id?: string
          notes?: string | null
          preferred_room_type?: string | null
          priority?: number | null
          restaurant_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          check_in_date?: string
          check_out_date?: string
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          guests_count?: number | null
          id?: string
          notes?: string | null
          preferred_room_type?: string | null
          priority?: number | null
          restaurant_id?: string
          status?: string | null
          updated_at?: string | null
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
      shared_bills: {
        Row: {
          bill_data: Json
          created_at: string
          id: string
          short_id: string
          tenant_id: string | null
        }
        Insert: {
          bill_data: Json
          created_at?: string
          id?: string
          short_id: string
          tenant_id?: string | null
        }
        Update: {
          bill_data?: Json
          created_at?: string
          id?: string
          short_id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          auto_clock_out_minutes: number | null
          color: string | null
          created_at: string | null
          end_time: string
          grace_period_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          restaurant_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          auto_clock_out_minutes?: number | null
          color?: string | null
          created_at?: string | null
          end_time: string
          grace_period_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          restaurant_id: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          auto_clock_out_minutes?: number | null
          color?: string | null
          created_at?: string | null
          end_time?: string
          grace_period_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          restaurant_id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      split_bill_portions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_number: string | null
          items: Json | null
          paid_at: string | null
          payer_email: string | null
          payer_name: string
          payer_phone: string | null
          payment_method: string | null
          payment_status: string | null
          percentage: number | null
          split_bill_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json | null
          paid_at?: string | null
          payer_email?: string | null
          payer_name: string
          payer_phone?: string | null
          payment_method?: string | null
          payment_status?: string | null
          percentage?: number | null
          split_bill_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json | null
          paid_at?: string | null
          payer_email?: string | null
          payer_name?: string
          payer_phone?: string | null
          payment_method?: string | null
          payment_status?: string | null
          percentage?: number | null
          split_bill_id?: string | null
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
          check_in_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          num_portions: number | null
          original_amount: number
          restaurant_id: string
          split_method: string | null
        }
        Insert: {
          check_in_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          num_portions?: number | null
          original_amount: number
          restaurant_id: string
          split_method?: string | null
        }
        Update: {
          check_in_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          num_portions?: number | null
          original_amount?: number
          restaurant_id?: string
          split_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "split_bills_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_role"
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
          created_at: string
          document_name: string
          document_number: string | null
          document_type: string
          file_size: number | null
          google_drive_file_id: string | null
          google_drive_url: string | null
          id: string
          is_verified: boolean | null
          mime_type: string | null
          restaurant_id: string
          staff_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_number?: string | null
          document_type: string
          file_size?: number | null
          google_drive_file_id?: string | null
          google_drive_url?: string | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          restaurant_id: string
          staff_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_number?: string | null
          document_type?: string
          file_size?: number | null
          google_drive_file_id?: string | null
          google_drive_url?: string | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          restaurant_id?: string
          staff_id?: string
          updated_at?: string
          uploaded_by?: string | null
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
          carry_forward: boolean | null
          created_at: string
          days_per_year: number | null
          description: string | null
          id: string
          is_paid: boolean | null
          max_carry_forward_days: number | null
          name: string
          requires_approval: boolean | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          accrual_amount?: number | null
          accrual_period?: string | null
          accrual_type?: string | null
          carry_forward?: boolean | null
          created_at?: string
          days_per_year?: number | null
          description?: string | null
          id?: string
          is_paid?: boolean | null
          max_carry_forward_days?: number | null
          name: string
          requires_approval?: boolean | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          accrual_amount?: number | null
          accrual_period?: string | null
          accrual_type?: string | null
          carry_forward?: boolean | null
          created_at?: string
          days_per_year?: number | null
          description?: string | null
          id?: string
          is_paid?: boolean | null
          max_carry_forward_days?: number | null
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
      staff_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          reference_type: string | null
          restaurant_id: string
          staff_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id: string
          staff_id: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string
          staff_id?: string
          title?: string
          type?: string
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
        Relationships: []
      }
      staff_shift_assignments: {
        Row: {
          created_at: string | null
          created_by: string | null
          day_of_week: number
          effective_from: string | null
          effective_until: string | null
          id: string
          is_active: boolean | null
          restaurant_id: string
          shift_id: string
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          day_of_week: number
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          restaurant_id: string
          shift_id: string
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          restaurant_id?: string
          shift_id?: string
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_shift_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shift_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_role"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "shifts"
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
          auto_clocked_out: boolean | null
          clock_in: string
          clock_in_status: string | null
          clock_out: string | null
          created_at: string
          id: string
          manager_override: boolean | null
          minutes_variance: number | null
          notes: string | null
          override_by: string | null
          override_reason: string | null
          restaurant_id: string
          shift_id: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          auto_clocked_out?: boolean | null
          clock_in: string
          clock_in_status?: string | null
          clock_out?: string | null
          created_at?: string
          id?: string
          manager_override?: boolean | null
          minutes_variance?: number | null
          notes?: string | null
          override_by?: string | null
          override_reason?: string | null
          restaurant_id: string
          shift_id?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          auto_clocked_out?: boolean | null
          clock_in?: string
          clock_in_status?: string | null
          clock_out?: string | null
          created_at?: string
          id?: string
          manager_override?: boolean | null
          minutes_variance?: number | null
          notes?: string | null
          override_by?: string | null
          override_reason?: string | null
          restaurant_id?: string
          shift_id?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_time_clock_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_clock_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_clock_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
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
      storage_locations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          location_type: string | null
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string | null
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string | null
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          components: Json | null
          components_backup: Json | null
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
          components_backup?: Json | null
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
          components_backup?: Json | null
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
      supplier_price_history: {
        Row: {
          id: string
          inventory_item_id: string
          notes: string | null
          purchase_order_id: string | null
          quantity: number | null
          recorded_at: string | null
          restaurant_id: string
          supplier_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          inventory_item_id: string
          notes?: string | null
          purchase_order_id?: string | null
          quantity?: number | null
          recorded_at?: string | null
          restaurant_id: string
          supplier_id: string
          unit_price: number
        }
        Update: {
          id?: string
          inventory_item_id?: string
          notes?: string | null
          purchase_order_id?: string | null
          quantity?: number | null
          recorded_at?: string | null
          restaurant_id?: string
          supplier_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_history_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_supplier_id_fkey"
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
      sync_logs: {
        Row: {
          channel_id: string | null
          completed_at: string | null
          direction: string
          duration_ms: number | null
          error_details: Json | null
          http_status_code: number | null
          id: string
          records_failed: number | null
          records_processed: number | null
          request_payload: Json | null
          response_payload: Json | null
          restaurant_id: string
          started_at: string | null
          status: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          channel_id?: string | null
          completed_at?: string | null
          direction?: string
          duration_ms?: number | null
          error_details?: Json | null
          http_status_code?: number | null
          id?: string
          records_failed?: number | null
          records_processed?: number | null
          request_payload?: Json | null
          response_payload?: Json | null
          restaurant_id: string
          started_at?: string | null
          status?: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          channel_id?: string | null
          completed_at?: string | null
          direction?: string
          duration_ms?: number | null
          error_details?: Json | null
          http_status_code?: number | null
          id?: string
          records_failed?: number | null
          records_processed?: number | null
          request_payload?: Json | null
          response_payload?: Json | null
          restaurant_id?: string
          started_at?: string | null
          status?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "booking_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_retry_queue: {
        Row: {
          attempts: number | null
          backoff_seconds: number | null
          channel_id: string
          created_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          next_retry_at: string | null
          payload: Json
          resolved_at: string | null
          response_payload: Json | null
          restaurant_id: string
          status: string | null
          sync_log_id: string | null
          sync_type: string
        }
        Insert: {
          attempts?: number | null
          backoff_seconds?: number | null
          channel_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          payload: Json
          resolved_at?: string | null
          response_payload?: Json | null
          restaurant_id: string
          status?: string | null
          sync_log_id?: string | null
          sync_type: string
        }
        Update: {
          attempts?: number | null
          backoff_seconds?: number | null
          channel_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          payload?: Json
          resolved_at?: string | null
          response_payload?: Json | null
          restaurant_id?: string
          status?: string | null
          sync_log_id?: string | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_retry_queue_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "booking_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_retry_queue_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_retry_queue_sync_log_id_fkey"
            columns: ["sync_log_id"]
            isOneToOne: false
            referencedRelation: "sync_logs"
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
          confirmation_method: string | null
          confirmation_sent: boolean | null
          confirmation_sent_at: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          departure_time: string | null
          duration_minutes: number
          id: string
          notes: string | null
          party_size: number
          reminder_sent: boolean | null
          reminder_sent_at: string | null
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
          confirmation_method?: string | null
          confirmation_sent?: boolean | null
          confirmation_sent_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          departure_time?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          party_size: number
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
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
          confirmation_method?: string | null
          confirmation_sent?: boolean | null
          confirmation_sent_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          departure_time?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          party_size?: number
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
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
        Relationships: []
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
          check_in_time: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          estimated_wait_time: number | null
          id: string
          notes: string | null
          party_size: number
          priority: number | null
          restaurant_id: string
          seated_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          check_in_time?: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          estimated_wait_time?: number | null
          id?: string
          notes?: string | null
          party_size: number
          priority?: number | null
          restaurant_id: string
          seated_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          check_in_time?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          estimated_wait_time?: number | null
          id?: string
          notes?: string | null
          party_size?: number
          priority?: number | null
          restaurant_id?: string
          seated_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_campaign_sends: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          failure_reason: string | null
          id: string
          msg91_request_id: string | null
          read_at: string | null
          restaurant_id: string
          sent_at: string | null
          status: string | null
          template_name: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          failure_reason?: string | null
          id?: string
          msg91_request_id?: string | null
          read_at?: string | null
          restaurant_id: string
          sent_at?: string | null
          status?: string | null
          template_name?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          failure_reason?: string | null
          id?: string
          msg91_request_id?: string | null
          read_at?: string | null
          restaurant_id?: string
          sent_at?: string | null
          status?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_sends_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_sends_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          admin_notes: string | null
          body: string
          buttons: Json | null
          category: string
          created_at: string | null
          created_by: string | null
          display_name: string
          footer_text: string | null
          header_text: string | null
          id: string
          is_default: boolean | null
          language: string
          meta_response: Json | null
          name: string
          restaurant_id: string
          status: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          admin_notes?: string | null
          body: string
          buttons?: Json | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          display_name: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_default?: boolean | null
          language?: string
          meta_response?: Json | null
          name: string
          restaurant_id: string
          status?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          admin_notes?: string | null
          body?: string
          buttons?: Json | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          display_name?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_default?: boolean | null
          language?: string
          meta_response?: Json | null
          name?: string
          restaurant_id?: string
          status?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
      profiles_with_role: {
        Row: {
          id: string | null
          restaurant_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          role_id: string | null
          role_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      timezone_names_cache: {
        Row: {
          name: string | null
        }
        Relationships: []
      }
      unified_orders: {
        Row: {
          attendant: string | null
          bumped_at: string | null
          completed_at: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          discount_percentage: number | null
          estimated_prep_time: number | null
          id: string | null
          item_completion_status: Json | null
          items_jsonb: Json | null
          items_text: string[] | null
          kitchen_order_id: string | null
          kitchen_status: string | null
          order_type: string | null
          payment_status: string | null
          priority: string | null
          reservation_id: string | null
          restaurant_id: string | null
          server_name: string | null
          source: string | null
          started_at: string | null
          station: string | null
          status: string | null
          total: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
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
          activity_type_param: string
          customer_id_param: string
          description_param: string
          restaurant_id_param: string
        }
        Returns: {
          activity_type: string
          created_at: string | null
          customer_id: string | null
          description: string
          id: string
          restaurant_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customer_activities"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      add_customer_note: {
        Args: {
          content_param: string
          created_by_param: string
          customer_id_param: string
          restaurant_id_param: string
        }
        Returns: {
          content: string
          created_at: string | null
          created_by: string
          customer_id: string | null
          id: string
          restaurant_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customer_notes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      add_loyalty_transaction: {
        Args: {
          created_by_param: string
          customer_id_param: string
          notes_param: string
          points_param: number
          restaurant_id_param: string
          source_param: string
          transaction_type_param: string
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
        SetofOptions: {
          from: "*"
          to: "loyalty_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      calculate_customer_tier: {
        Args: { customer_points: number; restaurant_id_param: string }
        Returns: string
      }
      check_access: {
        Args: { _restaurant_id: string; _table_name: string }
        Returns: boolean
      }
      generate_purchase_order_number: {
        Args: { restaurant_id_param: string }
        Returns: string
      }
      generate_time_slots_for_date: {
        Args: {
          p_date: string
          p_restaurant_id: string
          p_slot_duration_minutes?: number
        }
        Returns: {
          time_slot: string
        }[]
      }
      get_analytics_data: {
        Args: {
          p_end_date: string
          p_restaurant_id: string
          p_start_date: string
        }
        Returns: Json
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
        SetofOptions: {
          from: "*"
          to: "customer_activities"
          isOneToOne: false
          isSetofReturn: true
        }
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
        SetofOptions: {
          from: "*"
          to: "customer_notes"
          isOneToOne: false
          isSetofReturn: true
        }
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
        SetofOptions: {
          from: "*"
          to: "loyalty_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_components: {
        Args: { user_id: string }
        Returns: {
          component_name: string
        }[]
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          permission: string
        }[]
      }
      get_user_restaurant_id: { Args: { _user_id?: string }; Returns: string }
      get_user_role_name: { Args: { user_id: string }; Returns: string }
      has_active_subscription: {
        Args: { restaurant_id: string }
        Returns: boolean
      }
      has_any_role:
        | { Args: { _roles: string[]; _user_id: string }; Returns: boolean }
        | {
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
      seed_system_roles: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      suggest_purchase_orders: {
        Args: { restaurant_id_param: string }
        Returns: {
          estimated_total: number
          items_count: number
          supplier_id: string
          supplier_name: string
        }[]
      }
      user_has_role_or_permission: {
        Args: { required_permissions?: string[]; required_roles: string[] }
        Returns: boolean
      }
      user_has_table_access: {
        Args: { _restaurant_id?: string; _table_name: string; _user_id: string }
        Returns: boolean
      }
      user_is_admin: { Args: { user_id: string }; Returns: boolean }
      user_is_admin_or_owner: { Args: { user_id?: string }; Returns: boolean }
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
