# 🗄️ Tasty Bite Harbor — Supabase Backend Catalog

This document lists all database tables, columns, functions, triggers, and Edge functions of the Supabase backend for project ID `clmsoetktmvhazctlans`.

---

## 📊 Database Schema Summary

- **Total Tables:** 133
- **Total Database Functions (RPCs):** 69
- **Total Triggers:** 85
- **Total Edge Functions:** 46

---

## 📁 1. Detailed Database Tables Schema

Below is the schema breakdown of every database table in the `public` schema.

### 📋 app_components

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `name` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 audit_logs

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `user_id` | `uuid` | `YES` | *None* |
| `action` | `text` | `NO` | *None* |
| `table_name` | `text` | `YES` | *None* |
| `record_id` | `uuid` | `YES` | *None* |
| `old_values` | `jsonb` | `YES` | *None* |
| `new_values` | `jsonb` | `YES` | *None* |
| `ip_address` | `inet` | `YES` | *None* |
| `user_agent` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 backup_settings

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `auto_backup_enabled` | `boolean` | `NO` | `false` |
| `backup_frequency` | `text` | `NO` | `'daily'::text` |
| `retention_days` | `integer` | `NO` | `30` |
| `backup_location` | `text` | `NO` | `'local'::text` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 backups

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `backup_type` | `text` | `NO` | *None* |
| `file_path` | `text` | `YES` | *None* |
| `file_size` | `bigint` | `YES` | *None* |
| `status` | `text` | `YES` | `'in_progress'::text` |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `completed_at` | `timestamp with time zone` | `YES` | *None* |
| `backup_data` | `jsonb` | `YES` | *None* |
| `name` | `text` | `YES` | *None* |


### 📋 batch_productions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `recipe_id` | `uuid` | `NO` | *None* |
| `batch_size` | `integer` | `NO` | *None* |
| `production_date` | `date` | `NO` | `CURRENT_DATE` |
| `produced_by` | `uuid` | `YES` | *None* |
| `total_cost` | `numeric` | `YES` | *None* |
| `cost_per_unit` | `numeric` | `YES` | *None* |
| `yield_actual` | `integer` | `YES` | *None* |
| `yield_expected` | `integer` | `YES` | *None* |
| `yield_percentage` | `numeric` | `YES` | *None* |
| `waste_amount` | `numeric` | `YES` | *None* |
| `waste_reason` | `text` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `status` | `text` | `YES` | `'planned'::text` |
| `started_at` | `timestamp with time zone` | `YES` | *None* |
| `completed_at` | `timestamp with time zone` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 booking_channels

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `channel_name` | `text` | `NO` | *None* |
| `channel_type` | `text` | `NO` | *None* |
| `api_endpoint` | `text` | `YES` | *None* |
| `api_key` | `text` | `YES` | *None* |
| `api_secret` | `text` | `YES` | *None* |
| `commission_rate` | `numeric` | `YES` | `0` |
| `is_active` | `boolean` | `YES` | `true` |
| `last_sync` | `timestamp with time zone` | `YES` | *None* |
| `sync_frequency_minutes` | `integer` | `YES` | `60` |
| `channel_settings` | `jsonb` | `YES` | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 budget_line_items

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `budget_id` | `uuid` | `NO` | *None* |
| `account_id` | `uuid` | `NO` | *None* |
| `period_start` | `date` | `NO` | *None* |
| `period_end` | `date` | `NO` | *None* |
| `budgeted_amount` | `numeric` | `NO` | *None* |
| `actual_amount` | `numeric` | `YES` | `0` |
| `variance_amount` | `numeric` | `YES` | `0` |
| `variance_percentage` | `numeric` | `YES` | `0` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 budgets

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `budget_name` | `text` | `NO` | *None* |
| `budget_year` | `integer` | `NO` | *None* |
| `budget_type` | `text` | `NO` | *None* |
| `status` | `text` | `NO` | `'draft'::text` |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 categories

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `uuid_generate_v4()` |
| `name` | `text` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `restaurant_id` | `uuid` | `YES` | *None* |


### 📋 channel_inventory

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `room_id` | `uuid` | `NO` | *None* |
| `channel_id` | `uuid` | `NO` | *None* |
| `rate_plan_id` | `uuid` | `NO` | *None* |
| `date` | `date` | `NO` | *None* |
| `available_rooms` | `integer` | `NO` | `0` |
| `price` | `numeric` | `NO` | *None* |
| `min_stay` | `integer` | `YES` | `1` |
| `closed_to_arrival` | `boolean` | `YES` | `false` |
| `closed_to_departure` | `boolean` | `YES` | `false` |
| `stop_sell` | `boolean` | `YES` | `false` |
| `last_updated` | `timestamp with time zone` | `YES` | `now()` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 channel_rate_rules

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `channel_id` | `uuid` | `NO` | *None* |
| `rate_plan_id` | `uuid` | `YES` | *None* |
| `rule_name` | `text` | `NO` | *None* |
| `rule_type` | `text` | `NO` | *None* |
| `value` | `numeric` | `NO` | *None* |
| `is_percentage` | `boolean` | `YES` | `true` |
| `min_price` | `numeric` | `YES` | *None* |
| `max_price` | `numeric` | `YES` | *None* |
| `priority` | `integer` | `YES` | `0` |
| `applies_to_dates` | `daterange` | `YES` | *None* |
| `days_of_week` | `ARRAY` | `YES` | `'{0,1,2,3,4,5,6}'::integer[]` |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 channel_restrictions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `channel_id` | `uuid` | `YES` | *None* |
| `room_type` | `text` | `YES` | *None* |
| `restriction_type` | `text` | `NO` | *None* |
| `value` | `jsonb` | `NO` | `'{}'::jsonb` |
| `date_from` | `date` | `NO` | *None* |
| `date_to` | `date` | `NO` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 channel_room_mapping

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `channel_id` | `uuid` | `NO` | *None* |
| `hms_room_type` | `text` | `NO` | *None* |
| `hms_room_type_id` | `uuid` | `YES` | *None* |
| `ota_room_type_id` | `text` | `NO` | *None* |
| `ota_rate_plan_id` | `text` | `NO` | *None* |
| `ota_room_name` | `text` | `YES` | *None* |
| `max_occupancy` | `integer` | `YES` | `2` |
| `is_mapped` | `boolean` | `YES` | `true` |
| `mapping_notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 chart_of_accounts

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `account_code` | `text` | `NO` | *None* |
| `account_name` | `text` | `NO` | *None* |
| `account_type` | `text` | `NO` | *None* |
| `account_subtype` | `text` | `YES` | *None* |
| `parent_account_id` | `uuid` | `YES` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `description` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 check_ins

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `reservation_id` | `uuid` | `NO` | *None* |
| `guest_profile_id` | `uuid` | `NO` | *None* |
| `room_id` | `uuid` | `NO` | *None* |
| `check_in_time` | `timestamp with time zone` | `NO` | `now()` |
| `expected_check_out` | `timestamp with time zone` | `NO` | *None* |
| `actual_check_out` | `timestamp with time zone` | `YES` | *None* |
| `status` | `text` | `NO` | `'checked_in'::text` |
| `check_in_method` | `text` | `NO` | `'front_desk'::text` |
| `room_rate` | `numeric` | `NO` | *None* |
| `total_guests` | `integer` | `NO` | `1` |
| `special_requests` | `text` | `YES` | *None* |
| `key_cards_issued` | `integer` | `YES` | `1` |
| `security_deposit` | `numeric` | `YES` | `0` |
| `additional_charges` | `jsonb` | `YES` | `'[]'::jsonb` |
| `staff_notes` | `text` | `YES` | *None* |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 competitor_pricing

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `competitor_name` | `text` | `NO` | *None* |
| `competitor_url` | `text` | `YES` | *None* |
| `room_type` | `text` | `YES` | *None* |
| `date` | `date` | `NO` | *None* |
| `price` | `numeric` | `NO` | *None* |
| `currency` | `text` | `YES` | `'INR'::text` |
| `last_scraped` | `timestamp with time zone` | `YES` | `now()` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 component_permissions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `component_id` | `uuid` | `NO` | *None* |
| `permission` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 component_table_mapping

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `component_id` | `uuid` | `YES` | *None* |
| `table_name` | `text` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 currencies

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `name` | `text` | `NO` | *None* |
| `code` | `text` | `NO` | *None* |
| `symbol` | `text` | `NO` | *None* |
| `commonly_used_in` | `text` | `YES` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 customer_activities

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `customer_id` | `uuid` | `YES` | *None* |
| `restaurant_id` | `uuid` | `YES` | *None* |
| `activity_type` | `text` | `NO` | *None* |
| `description` | `text` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 customer_insights

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `customer_name` | `text` | `YES` | *None* |
| `restaurant_id` | `uuid` | `YES` | *None* |
| `visit_count` | `bigint` | `YES` | *None* |
| `total_spent` | `numeric` | `YES` | *None* |
| `average_order_value` | `numeric` | `YES` | *None* |
| `first_visit` | `timestamp with time zone` | `YES` | *None* |
| `last_visit` | `timestamp with time zone` | `YES` | *None* |


### 📋 customer_notes

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `customer_id` | `uuid` | `YES` | *None* |
| `restaurant_id` | `uuid` | `YES` | *None* |
| `content` | `text` | `NO` | *None* |
| `created_by` | `text` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 customer_order_sessions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `qr_code_id` | `uuid` | `YES` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `entity_type` | `text` | `NO` | *None* |
| `entity_id` | `uuid` | `NO` | *None* |
| `session_token` | `text` | `NO` | *None* |
| `cart_items` | `jsonb` | `YES` | `'[]'::jsonb` |
| `customer_name` | `text` | `YES` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `special_instructions` | `text` | `YES` | *None* |
| `payment_status` | `text` | `YES` | `'pending'::text` |
| `payment_intent_id` | `text` | `YES` | *None* |
| `payment_amount` | `numeric` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |
| `expires_at` | `timestamp with time zone` | `YES` | `(now() + '02:00:00'::interval)` |


### 📋 customers

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `email` | `text` | `YES` | *None* |
| `phone` | `text` | `YES` | *None* |
| `address` | `text` | `YES` | *None* |
| `birthday` | `date` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `loyalty_points` | `integer` | `NO` | `0` |
| `tags` | `ARRAY` | `NO` | `'{}'::text[]` |
| `preferences` | `text` | `YES` | *None* |
| `last_visit_date` | `timestamp with time zone` | `YES` | *None* |
| `total_spent` | `numeric` | `NO` | `0` |
| `visit_count` | `integer` | `NO` | `0` |
| `average_order_value` | `numeric` | `NO` | `0` |
| `loyalty_enrolled` | `boolean` | `YES` | `false` |
| `loyalty_tier_id` | `uuid` | `YES` | *None* |
| `loyalty_points_last_updated` | `timestamp with time zone` | `YES` | *None* |


### 📋 daily_revenue_stats

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `date` | `date` | `NO` | *None* |
| `total_revenue` | `numeric` | `NO` | `0` |
| `order_count` | `integer` | `NO` | `0` |
| `average_order_value` | `numeric` | `NO` | `0` |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |


### 📋 daily_summary_reports

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `report_date` | `date` | `NO` | *None* |
| `total_orders` | `integer` | `YES` | `0` |
| `total_revenue` | `numeric` | `YES` | `0` |
| `total_items_sold` | `integer` | `YES` | `0` |
| `payment_breakdown` | `jsonb` | `YES` | `'{}'::jsonb` |
| `top_items` | `jsonb` | `YES` | `'[]'::jsonb` |
| `order_type_breakdown` | `jsonb` | `YES` | `'{}'::jsonb` |
| `nc_orders` | `integer` | `YES` | `0` |
| `nc_amount` | `numeric` | `YES` | `0` |
| `discount_amount` | `numeric` | `YES` | `0` |
| `average_order_value` | `numeric` | `YES` | `0` |
| `peak_hour` | `text` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `generated_by` | `uuid` | `YES` | *None* |
| `generated_at` | `timestamp with time zone` | `YES` | `now()` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 expense_categories

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `slug` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 expenses

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `category` | `text` | `NO` | *None* |
| `subcategory` | `text` | `YES` | *None* |
| `amount` | `numeric` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `expense_date` | `date` | `NO` | `CURRENT_DATE` |
| `payment_method` | `text` | `YES` | `'cash'::text` |
| `vendor_name` | `text` | `YES` | *None* |
| `receipt_url` | `text` | `YES` | *None* |
| `is_recurring` | `boolean` | `YES` | `false` |
| `recurring_frequency` | `text` | `YES` | *None* |
| `status` | `text` | `YES` | `'confirmed'::text` |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 financial_reports

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `report_type` | `text` | `NO` | *None* |
| `report_period_start` | `date` | `NO` | *None* |
| `report_period_end` | `date` | `NO` | *None* |
| `report_data` | `jsonb` | `NO` | *None* |
| `generated_at` | `timestamp with time zone` | `NO` | `now()` |
| `generated_by` | `uuid` | `YES` | *None* |


### 📋 gdpr_requests

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `type` | `text` | `NO` | *None* |
| `status` | `text` | `NO` | `'pending'::text` |
| `user_email` | `text` | `NO` | *None* |
| `reason` | `text` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `completed_at` | `timestamp with time zone` | `YES` | *None* |


### 📋 guest_feedback

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `reservation_id` | `uuid` | `YES` | *None* |
| `room_id` | `uuid` | `YES` | *None* |
| `guest_name` | `text` | `NO` | *None* |
| `guest_email` | `text` | `YES` | *None* |
| `guest_phone` | `text` | `YES` | *None* |
| `feedback_type` | `text` | `NO` | *None* |
| `rating` | `integer` | `NO` | *None* |
| `title` | `text` | `YES` | *None* |
| `comment` | `text` | `YES` | *None* |
| `is_complaint` | `boolean` | `YES` | `false` |
| `status` | `text` | `NO` | `'new'::text` |
| `assigned_to` | `uuid` | `YES` | *None* |
| `resolution_notes` | `text` | `YES` | *None* |
| `resolved_at` | `timestamp with time zone` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 guest_loyalty

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `guest_phone` | `text` | `NO` | *None* |
| `guest_name` | `text` | `YES` | *None* |
| `guest_email` | `text` | `YES` | *None* |
| `tier` | `text` | `YES` | `'regular'::text` |
| `total_stays` | `integer` | `YES` | `0` |
| `total_spent` | `numeric` | `YES` | `0` |
| `last_stay_date` | `date` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 guest_preferences

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `guest_name` | `text` | `NO` | *None* |
| `guest_email` | `text` | `YES` | *None* |
| `guest_phone` | `text` | `YES` | *None* |
| `room_preferences` | `jsonb` | `YES` | `'{}'::jsonb` |
| `food_preferences` | `jsonb` | `YES` | `'{}'::jsonb` |
| `service_preferences` | `jsonb` | `YES` | `'{}'::jsonb` |
| `special_occasions` | `jsonb` | `YES` | `'[]'::jsonb` |
| `notes` | `text` | `YES` | *None* |
| `last_stay` | `timestamp with time zone` | `YES` | *None* |
| `total_stays` | `integer` | `YES` | `0` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 guest_profiles

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `guest_name` | `text` | `NO` | *None* |
| `guest_email` | `text` | `YES` | *None* |
| `guest_phone` | `text` | `YES` | *None* |
| `date_of_birth` | `date` | `YES` | *None* |
| `nationality` | `text` | `YES` | *None* |
| `id_type` | `text` | `YES` | *None* |
| `id_number` | `text` | `YES` | *None* |
| `address` | `jsonb` | `YES` | `'{}'::jsonb` |
| `emergency_contact` | `jsonb` | `YES` | `'{}'::jsonb` |
| `preferences` | `jsonb` | `YES` | `'{}'::jsonb` |
| `vip_status` | `boolean` | `YES` | `false` |
| `blacklisted` | `boolean` | `YES` | `false` |
| `notes` | `text` | `YES` | *None* |
| `total_stays` | `integer` | `YES` | `0` |
| `total_spent` | `numeric` | `YES` | `0` |
| `last_stay` | `timestamp with time zone` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 homemade_production_log_items

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `production_log_id` | `uuid` | `NO` | *None* |
| `inventory_item_id` | `uuid` | `NO` | *None* |
| `quantity_consumed` | `numeric` | `NO` | *None* |
| `unit` | `text` | `NO` | *None* |
| `cost_per_unit` | `numeric` | `NO` | `0` |
| `total_cost` | `numeric` | `NO` | `0` |


### 📋 homemade_production_logs

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `output_inventory_item_id` | `uuid` | `NO` | *None* |
| `output_quantity` | `numeric` | `NO` | *None* |
| `output_unit` | `text` | `NO` | *None* |
| `total_cost` | `numeric` | `NO` | `0` |
| `cost_per_unit` | `numeric` | `NO` | `0` |
| `notes` | `text` | `YES` | *None* |
| `produced_at` | `timestamp with time zone` | `YES` | `now()` |
| `produced_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 inventory_alerts

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `inventory_item_id` | `uuid` | `NO` | *None* |
| `alert_type` | `text` | `NO` | *None* |
| `message` | `text` | `NO` | *None* |
| `is_read` | `boolean` | `YES` | `false` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `acknowledged_at` | `timestamp with time zone` | `YES` | *None* |
| `acknowledged_by` | `uuid` | `YES` | *None* |


### 📋 inventory_items

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `quantity` | `numeric` | `NO` | `0` |
| `unit` | `text` | `NO` | *None* |
| `reorder_level` | `numeric` | `YES` | *None* |
| `cost_per_unit` | `numeric` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `category` | `text` | `NO` | `'Other'::text` |
| `notification_sent` | `boolean` | `YES` | `false` |
| `storage_location_id` | `uuid` | `YES` | *None* |
| `is_produced` | `boolean` | `YES` | `false` |


### 📋 inventory_lots

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `inventory_item_id` | `uuid` | `NO` | *None* |
| `purchase_date` | `timestamp with time zone` | `NO` | `now()` |
| `quantity_purchased` | `numeric` | `NO` | *None* |
| `quantity_remaining` | `numeric` | `NO` | *None* |
| `unit_cost` | `numeric` | `NO` | `0` |
| `supplier_id` | `uuid` | `YES` | *None* |
| `purchase_order_id` | `uuid` | `YES` | *None* |
| `lot_number` | `text` | `YES` | *None* |
| `expiry_date` | `date` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 inventory_transactions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `inventory_item_id` | `uuid` | `NO` | *None* |
| `transaction_type` | `text` | `NO` | *None* |
| `quantity_change` | `numeric` | `NO` | *None* |
| `reference_type` | `text` | `YES` | *None* |
| `reference_id` | `uuid` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `unit_cost_at_time` | `numeric` | `YES` | *None* |
| `total_cost` | `numeric` | `YES` | *None* |
| `lot_id` | `uuid` | `YES` | *None* |


### 📋 invoice_line_items

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `invoice_id` | `uuid` | `NO` | *None* |
| `description` | `text` | `NO` | *None* |
| `quantity` | `numeric` | `NO` | `1` |
| `unit_price` | `numeric` | `NO` | *None* |
| `total_price` | `numeric` | `NO` | *None* |
| `tax_rate` | `numeric` | `YES` | `0` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `hsn_code` | `character varying` | `YES` | *None* |
| `cgst_amount` | `numeric` | `YES` | `0` |
| `sgst_amount` | `numeric` | `YES` | `0` |
| `igst_amount` | `numeric` | `YES` | `0` |


### 📋 invoices

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `invoice_number` | `text` | `NO` | *None* |
| `customer_name` | `text` | `NO` | *None* |
| `customer_email` | `text` | `YES` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `customer_address` | `text` | `YES` | *None* |
| `invoice_date` | `date` | `NO` | *None* |
| `due_date` | `date` | `NO` | *None* |
| `subtotal` | `numeric` | `NO` | `0` |
| `tax_amount` | `numeric` | `NO` | `0` |
| `discount_amount` | `numeric` | `NO` | `0` |
| `total_amount` | `numeric` | `NO` | `0` |
| `paid_amount` | `numeric` | `NO` | `0` |
| `status` | `text` | `NO` | `'draft'::text` |
| `payment_terms` | `text` | `YES` | `'net_30'::text` |
| `notes` | `text` | `YES` | *None* |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `customer_gstin` | `character varying` | `YES` | *None* |
| `place_of_supply` | `character varying` | `YES` | *None* |
| `is_b2b` | `boolean` | `YES` | `false` |


### 📋 journal_entries

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `entry_number` | `text` | `NO` | *None* |
| `entry_date` | `date` | `NO` | *None* |
| `description` | `text` | `NO` | *None* |
| `reference_type` | `text` | `YES` | *None* |
| `reference_id` | `uuid` | `YES` | *None* |
| `total_amount` | `numeric` | `NO` | *None* |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 journal_entry_lines

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `journal_entry_id` | `uuid` | `NO` | *None* |
| `account_id` | `uuid` | `NO` | *None* |
| `debit_amount` | `numeric` | `YES` | `0` |
| `credit_amount` | `numeric` | `YES` | `0` |
| `description` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 kitchen_orders

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `order_id` | `uuid` | `YES` | *None* |
| `source` | `text` | `NO` | *None* |
| `status` | `text` | `NO` | `'new'::text` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `restaurant_id` | `uuid` | `YES` | *None* |
| `items` | `jsonb` | `NO` | *None* |
| `table_number` | `text` | `YES` | *None* |
| `customer_name` | `text` | `YES` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `priority` | `text` | `YES` | `'normal'::text` |
| `station` | `text` | `YES` | *None* |
| `estimated_prep_time` | `integer` | `YES` | *None* |
| `started_at` | `timestamp with time zone` | `YES` | *None* |
| `completed_at` | `timestamp with time zone` | `YES` | *None* |
| `bumped_at` | `timestamp with time zone` | `YES` | *None* |
| `item_completion_status` | `jsonb` | `YES` | `'[]'::jsonb` |
| `server_name` | `text` | `YES` | *None* |
| `order_type` | `text` | `YES` | `'dine_in'::text` |
| `nc_reason` | `text` | `YES` | *None* |
| `round_number` | `integer` | `YES` | `1` |


### 📋 lost_found_items

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `item_name` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `category` | `text` | `YES` | *None* |
| `found_location` | `text` | `YES` | *None* |
| `room_id` | `uuid` | `YES` | *None* |
| `found_date` | `date` | `NO` | *None* |
| `found_by` | `uuid` | `YES` | *None* |
| `storage_location` | `text` | `YES` | *None* |
| `status` | `text` | `YES` | `'stored'::text` |
| `guest_name` | `text` | `YES` | *None* |
| `guest_phone` | `text` | `YES` | *None* |
| `claimed_date` | `date` | `YES` | *None* |
| `claimed_by` | `text` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `image_url` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 loyalty_enrollments

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `customer_id` | `uuid` | `YES` | *None* |
| `name` | `text` | `NO` | *None* |
| `email` | `text` | `YES` | *None* |
| `phone` | `text` | `YES` | *None* |
| `birthday` | `date` | `YES` | *None* |
| `source` | `text` | `YES` | `'qr_code'::text` |
| `status` | `text` | `YES` | `'approved'::text` |
| `welcome_points_awarded` | `integer` | `YES` | `50` |
| `enrolled_at` | `timestamp with time zone` | `YES` | `now()` |
| `approved_at` | `timestamp with time zone` | `YES` | `now()` |
| `approved_by` | `uuid` | `YES` | *None* |
| `metadata` | `jsonb` | `YES` | `'{}'::jsonb` |
| `user_agent` | `text` | `YES` | *None* |
| `ip_address` | `inet` | `YES` | *None* |


### 📋 loyalty_programs

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `is_enabled` | `boolean` | `YES` | `false` |
| `points_per_amount` | `numeric` | `NO` | `1` |
| `amount_per_point` | `numeric` | `NO` | `100` |
| `points_expiry_days` | `integer` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `free_order_interval` | `integer` | `YES` | *None* |
| `max_redemption_percentage` | `numeric` | `YES` | `100` |
| `spend_threshold` | `numeric` | `NO` | `100` |


### 📋 loyalty_redemptions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `customer_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `reward_id` | `uuid` | `NO` | *None* |
| `order_id` | `uuid` | `NO` | *None* |
| `points_used` | `integer` | `NO` | *None* |
| `discount_applied` | `numeric` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 loyalty_rewards

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `points_required` | `integer` | `NO` | *None* |
| `reward_type` | `text` | `NO` | *None* |
| `reward_value` | `numeric` | `NO` | *None* |
| `tier_id` | `uuid` | `YES` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 loyalty_tiers

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `points_required` | `integer` | `NO` | *None* |
| `benefits` | `jsonb` | `YES` | `'[]'::jsonb` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `display_order` | `integer` | `NO` | `0` |
| `min_spent` | `numeric` | `YES` | `0` |
| `min_visits` | `integer` | `YES` | `0` |
| `points_multiplier` | `numeric` | `YES` | `1.0` |
| `color` | `text` | `YES` | `'bg-gray-500'::text` |


### 📋 loyalty_transactions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `customer_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `transaction_type` | `text` | `NO` | *None* |
| `points` | `integer` | `NO` | *None* |
| `source` | `text` | `NO` | *None* |
| `source_id` | `uuid` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 menu_item_variants

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `menu_item_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `price` | `numeric` | `NO` | *None* |
| `sort_order` | `integer` | `YES` | `0` |
| `is_available` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 menu_items

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `price` | `numeric` | `NO` | *None* |
| `category` | `text` | `NO` | *None* |
| `image_url` | `text` | `YES` | *None* |
| `is_available` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `is_special` | `boolean` | `YES` | `false` |
| `is_veg` | `boolean` | `YES` | `true` |
| `pricing_type` | `text` | `YES` | `'fixed'::text` |
| `pricing_unit` | `text` | `YES` | *None* |
| `base_unit_quantity` | `numeric` | `YES` | `1` |


### 📋 monthly_budgets

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `month` | `integer` | `NO` | *None* |
| `year` | `integer` | `NO` | *None* |
| `category` | `text` | `NO` | *None* |
| `budgeted_amount` | `numeric` | `NO` | *None* |
| `actual_amount` | `numeric` | `YES` | `0` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 night_audit_logs

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `audit_date` | `date` | `NO` | *None* |
| `status` | `text` | `YES` | `'pending'::text` |
| `total_revenue` | `numeric` | `YES` | `0` |
| `room_revenue` | `numeric` | `YES` | `0` |
| `food_revenue` | `numeric` | `YES` | `0` |
| `other_revenue` | `numeric` | `YES` | `0` |
| `rooms_charged` | `integer` | `YES` | `0` |
| `total_check_ins` | `integer` | `YES` | `0` |
| `total_check_outs` | `integer` | `YES` | `0` |
| `discrepancies` | `jsonb` | `YES` | `'[]'::jsonb` |
| `notes` | `text` | `YES` | *None* |
| `performed_by` | `uuid` | `YES` | *None* |
| `completed_at` | `timestamp with time zone` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 operational_costs

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `cost_type` | `character varying` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `amount` | `numeric` | `NO` | *None* |
| `cost_date` | `date` | `YES` | `CURRENT_DATE` |
| `is_recurring` | `boolean` | `YES` | `false` |
| `recurring_frequency` | `character varying` | `YES` | *None* |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 orders

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `customer_name` | `text` | `NO` | *None* |
| `items` | `ARRAY` | `NO` | *None* |
| `total` | `numeric` | `NO` | *None* |
| `status` | `text` | `NO` | `'pending'::text` |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `source` | `text` | `YES` | `'pos'::text` |
| `order_type` | `text` | `YES` | `'dine-in'::text` |
| `Customer_Name` | `text` | `YES` | *None* |
| `Customer_MobileNumber` | `text` | `YES` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `reservation_id` | `uuid` | `YES` | *None* |
| `payment_status` | `text` | `YES` | `'paid'::text` |
| `discount_amount` | `numeric` | `YES` | `0` |
| `discount_percentage` | `numeric` | `YES` | `0` |
| `attendant` | `text` | `YES` | *None* |
| `nc_reason` | `text` | `YES` | *None* |
| `original_subtotal` | `numeric` | `YES` | *None* |
| `is_qr_order` | `boolean` | `YES` | `false` |
| `qr_session_id` | `uuid` | `YES` | *None* |
| `payment_intent_id` | `text` | `YES` | *None* |
| `table_id` | `uuid` | `YES` | *None* |
| `room_id` | `uuid` | `YES` | *None* |
| `entity_name` | `text` | `YES` | *None* |
| `priority` | `text` | `YES` | `'normal'::text` |
| `order_number` | `integer` | `YES` | *None* |
| `item_completion_status` | `ARRAY` | `YES` | `'{}'::boolean[]` |
| `discount_notes` | `text` | `YES` | *None* |
| `payment_method` | `text` | `YES` | *None* |
| `split_payments` | `jsonb` | `YES` | *None* |
| `promotion_code` | `text` | `YES` | *None* |
| `promotion_name` | `text` | `YES` | *None* |


### 📋 orders_unified

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `order_number` | `text` | `YES` | *None* |
| `order_type` | `text` | `YES` | `'dine_in'::text` |
| `source` | `text` | `YES` | `'pos'::text` |
| `table_id` | `uuid` | `YES` | *None* |
| `table_number` | `text` | `YES` | *None* |
| `customer_id` | `uuid` | `YES` | *None* |
| `customer_name` | `text` | `YES` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `waiter_id` | `uuid` | `YES` | *None* |
| `server_name` | `text` | `YES` | *None* |
| `items` | `jsonb` | `NO` | `'[]'::jsonb` |
| `items_completion` | `jsonb` | `YES` | `'[]'::jsonb` |
| `kitchen_status` | `text` | `YES` | `'new'::text` |
| `station` | `text` | `YES` | *None* |
| `priority` | `integer` | `YES` | `0` |
| `estimated_time` | `integer` | `YES` | *None* |
| `started_at` | `timestamp with time zone` | `YES` | *None* |
| `completed_at` | `timestamp with time zone` | `YES` | *None* |
| `subtotal` | `numeric` | `YES` | `0` |
| `discount_amount` | `numeric` | `YES` | `0` |
| `discount_percentage` | `numeric` | `YES` | `0` |
| `tax_amount` | `numeric` | `YES` | `0` |
| `total_amount` | `numeric` | `NO` | `0` |
| `cgst_amount` | `numeric` | `YES` | `0` |
| `sgst_amount` | `numeric` | `YES` | `0` |
| `igst_amount` | `numeric` | `YES` | `0` |
| `payment_status` | `text` | `YES` | `'pending'::text` |
| `payment_method` | `text` | `YES` | *None* |
| `delivery_address` | `text` | `YES` | *None* |
| `delivery_notes` | `text` | `YES` | *None* |
| `status` | `text` | `YES` | `'pending'::text` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `reservation_id` | `uuid` | `YES` | *None* |


### 📋 orders_unified_backup_20260111_000000

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `YES` | *None* |
| `restaurant_id` | `uuid` | `YES` | *None* |
| `order_number` | `text` | `YES` | *None* |
| `order_type` | `text` | `YES` | *None* |
| `source` | `text` | `YES` | *None* |
| `table_id` | `uuid` | `YES` | *None* |
| `table_number` | `text` | `YES` | *None* |
| `customer_id` | `uuid` | `YES` | *None* |
| `customer_name` | `text` | `YES` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `waiter_id` | `uuid` | `YES` | *None* |
| `server_name` | `text` | `YES` | *None* |
| `items` | `jsonb` | `YES` | *None* |
| `items_completion` | `jsonb` | `YES` | *None* |
| `kitchen_status` | `text` | `YES` | *None* |
| `station` | `text` | `YES` | *None* |
| `priority` | `integer` | `YES` | *None* |
| `estimated_time` | `integer` | `YES` | *None* |
| `started_at` | `timestamp with time zone` | `YES` | *None* |
| `completed_at` | `timestamp with time zone` | `YES` | *None* |
| `subtotal` | `numeric` | `YES` | *None* |
| `discount_amount` | `numeric` | `YES` | *None* |
| `discount_percentage` | `numeric` | `YES` | *None* |
| `tax_amount` | `numeric` | `YES` | *None* |
| `total_amount` | `numeric` | `YES` | *None* |
| `cgst_amount` | `numeric` | `YES` | *None* |
| `sgst_amount` | `numeric` | `YES` | *None* |
| `igst_amount` | `numeric` | `YES` | *None* |
| `payment_status` | `text` | `YES` | *None* |
| `payment_method` | `text` | `YES` | *None* |
| `delivery_address` | `text` | `YES` | *None* |
| `delivery_notes` | `text` | `YES` | *None* |
| `status` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | *None* |
| `updated_at` | `timestamp with time zone` | `YES` | *None* |
| `reservation_id` | `uuid` | `YES` | *None* |


### 📋 ota_bookings

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `channel_id` | `uuid` | `NO` | *None* |
| `ota_booking_id` | `text` | `NO` | *None* |
| `ota_name` | `text` | `NO` | *None* |
| `guest_name` | `text` | `YES` | *None* |
| `guest_email` | `text` | `YES` | *None* |
| `guest_phone` | `text` | `YES` | *None* |
| `check_in` | `date` | `NO` | *None* |
| `check_out` | `date` | `NO` | *None* |
| `room_type` | `text` | `NO` | *None* |
| `room_count` | `integer` | `YES` | `1` |
| `adults` | `integer` | `YES` | `1` |
| `children` | `integer` | `YES` | `0` |
| `total_amount` | `numeric` | `YES` | *None* |
| `commission_amount` | `numeric` | `YES` | *None* |
| `net_amount` | `numeric` | `YES` | *None* |
| `currency` | `text` | `YES` | `'INR'::text` |
| `booking_status` | `text` | `YES` | `'confirmed'::text` |
| `payment_status` | `text` | `YES` | `'pending'::text` |
| `payment_mode` | `text` | `YES` | *None* |
| `special_requests` | `text` | `YES` | *None* |
| `raw_payload` | `jsonb` | `YES` | *None* |
| `synced_to_pms` | `boolean` | `YES` | `false` |
| `pms_reservation_id` | `uuid` | `YES` | *None* |
| `inventory_decremented` | `boolean` | `YES` | `false` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 ota_credentials

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `channel_id` | `uuid` | `YES` | *None* |
| `ota_name` | `text` | `NO` | *None* |
| `username` | `text` | `YES` | *None* |
| `password_encrypted` | `text` | `YES` | *None* |
| `access_token` | `text` | `YES` | *None* |
| `refresh_token` | `text` | `YES` | *None* |
| `token_expiry` | `timestamp with time zone` | `YES` | *None* |
| `api_endpoint` | `text` | `YES` | *None* |
| `auth_type` | `text` | `NO` | `'token'::text` |
| `extra_config` | `jsonb` | `YES` | `'{}'::jsonb` |
| `connection_status` | `text` | `YES` | `'disconnected'::text` |
| `last_tested_at` | `timestamp with time zone` | `YES` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 owner_notifications

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `type` | `text` | `NO` | *None* |
| `title` | `text` | `NO` | *None* |
| `message` | `text` | `NO` | *None* |
| `staff_name` | `text` | `NO` | `''::text` |
| `reference_id` | `text` | `YES` | *None* |
| `action_url` | `text` | `YES` | `'/staff'::text` |
| `is_read` | `boolean` | `YES` | `false` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 password_reset_tokens

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `email` | `text` | `NO` | *None* |
| `token` | `text` | `NO` | *None* |
| `expires_at` | `timestamp with time zone` | `NO` | *None* |
| `used` | `boolean` | `YES` | `false` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 payment_methods

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `type` | `text` | `NO` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `processing_fee_percentage` | `numeric` | `YES` | `0` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 payment_settings

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `upi_id` | `text` | `NO` | *None* |
| `upi_name` | `text` | `YES` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `gateway_type` | `text` | `YES` | `'upi'::text` |
| `paytm_mid` | `text` | `YES` | *None* |
| `paytm_merchant_key` | `text` | `YES` | *None* |
| `paytm_website` | `text` | `YES` | `'DEFAULT'::text` |
| `paytm_test_mode` | `boolean` | `YES` | `true` |
| `paytm_webhook_secret` | `text` | `YES` | *None* |
| `soundbox_enabled` | `boolean` | `YES` | `false` |
| `voice_announcement_enabled` | `boolean` | `YES` | `true` |
| `voice_announcement_template` | `text` | `YES` | `'detailed'::text` |
| `voice_announcement_language` | `text` | `YES` | `'en'::text` |


### 📋 payment_transactions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `order_id` | `text` | `YES` | *None* |
| `table_number` | `text` | `YES` | *None* |
| `paytm_order_id` | `text` | `NO` | *None* |
| `paytm_txn_id` | `text` | `YES` | *None* |
| `paytm_qr_id` | `text` | `YES` | *None* |
| `gateway_type` | `text` | `YES` | `'paytm'::text` |
| `amount` | `numeric` | `NO` | *None* |
| `currency` | `text` | `YES` | `'INR'::text` |
| `status` | `text` | `YES` | `'pending'::text` |
| `qr_code_data` | `text` | `YES` | *None* |
| `qr_image_base64` | `text` | `YES` | *None* |
| `webhook_payload` | `jsonb` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `completed_at` | `timestamp with time zone` | `YES` | *None* |
| `expires_at` | `timestamp with time zone` | `YES` | *None* |


### 📋 payments

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `payment_number` | `text` | `NO` | *None* |
| `invoice_id` | `uuid` | `YES` | *None* |
| `payment_date` | `date` | `NO` | *None* |
| `amount` | `numeric` | `NO` | *None* |
| `payment_method` | `text` | `NO` | *None* |
| `reference_number` | `text` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 platform_config

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `key` | `text` | `NO` | *None* |
| `value` | `jsonb` | `NO` | `'{}'::jsonb` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 pool_inventory

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `room_type` | `text` | `NO` | *None* |
| `total_count` | `integer` | `NO` | `0` |
| `available_count` | `integer` | `NO` | `0` |
| `blocked_count` | `integer` | `YES` | `0` |
| `buffer_count` | `integer` | `YES` | `0` |
| `date` | `date` | `NO` | `CURRENT_DATE` |
| `last_synced_at` | `timestamp with time zone` | `YES` | `now()` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 pos_transactions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `order_id` | `uuid` | `YES` | *None* |
| `kitchen_order_id` | `uuid` | `YES` | *None* |
| `amount` | `numeric` | `NO` | *None* |
| `payment_method` | `text` | `NO` | *None* |
| `status` | `text` | `NO` | `'completed'::text` |
| `customer_name` | `text` | `YES` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `staff_id` | `uuid` | `YES` | *None* |
| `discount_amount` | `numeric` | `YES` | `0` |
| `promotion_id` | `uuid` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |
| `split_payments` | `jsonb` | `YES` | *None* |


### 📋 pricing_rules

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `rule_name` | `text` | `NO` | *None* |
| `rule_type` | `text` | `NO` | *None* |
| `trigger_condition` | `jsonb` | `NO` | *None* |
| `adjustment_type` | `text` | `NO` | *None* |
| `adjustment_value` | `numeric` | `NO` | *None* |
| `min_price` | `numeric` | `YES` | *None* |
| `max_price` | `numeric` | `YES` | *None* |
| `priority` | `integer` | `YES` | `0` |
| `is_active` | `boolean` | `YES` | `true` |
| `valid_from` | `date` | `YES` | *None* |
| `valid_to` | `date` | `YES` | *None* |
| `days_of_week` | `jsonb` | `YES` | `'[0, 1, 2, 3, 4, 5, 6]'::jsonb` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 profiles

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | *None* |
| `first_name` | `text` | `YES` | *None* |
| `last_name` | `text` | `YES` | *None* |
| `role` | `USER-DEFINED` | `NO` | `'manager'::user_role` |
| `restaurant_id` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `role_id` | `uuid` | `YES` | *None* |
| `role_name_text` | `text` | `YES` | *None* |
| `email` | `text` | `YES` | *None* |
| `phone` | `text` | `YES` | *None* |
| `pos_pin` | `text` | `YES` | *None* |


### 📋 profiles_with_role

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `YES` | *None* |
| `role` | `USER-DEFINED` | `YES` | *None* |
| `restaurant_id` | `uuid` | `YES` | *None* |
| `role_id` | `uuid` | `YES` | *None* |
| `role_name` | `text` | `YES` | *None* |


### 📋 promotion_campaigns

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `start_date` | `date` | `NO` | *None* |
| `end_date` | `date` | `NO` | *None* |
| `discount_percentage` | `integer` | `YES` | `0` |
| `discount_amount` | `numeric` | `YES` | `0` |
| `promotion_code` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `status` | `text` | `YES` | `'suggested'::text` |
| `time_period` | `text` | `YES` | *None* |
| `potential_increase` | `text` | `YES` | *None* |
| `is_active` | `boolean` | `YES` | `true` |


### 📋 purchase_order_items

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `purchase_order_id` | `uuid` | `NO` | *None* |
| `inventory_item_id` | `uuid` | `NO` | *None* |
| `quantity` | `numeric` | `NO` | *None* |
| `unit_cost` | `numeric` | `NO` | *None* |
| `total_cost` | `numeric` | `NO` | *None* |
| `received_quantity` | `numeric` | `NO` | `0` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `expiry_date` | `date` | `YES` | *None* |


### 📋 purchase_orders

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `supplier_id` | `uuid` | `NO` | *None* |
| `order_number` | `text` | `NO` | *None* |
| `status` | `text` | `NO` | `'draft'::text` |
| `total_amount` | `numeric` | `NO` | `0` |
| `order_date` | `timestamp with time zone` | `NO` | `now()` |
| `expected_delivery_date` | `date` | `YES` | *None* |
| `delivery_date` | `date` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_by` | `uuid` | `YES` | *None* |
| `approved_by` | `uuid` | `YES` | *None* |
| `approved_at` | `timestamp with time zone` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 qr_codes

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `entity_type` | `text` | `NO` | *None* |
| `entity_id` | `uuid` | `NO` | *None* |
| `qr_code_data` | `text` | `NO` | *None* |
| `qr_code_url` | `text` | `YES` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 rate_parity_checks

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `check_date` | `date` | `NO` | *None* |
| `room_type` | `text` | `NO` | *None* |
| `channel_rates` | `jsonb` | `NO` | *None* |
| `base_rate` | `numeric` | `YES` | *None* |
| `parity_status` | `text` | `YES` | `'unchecked'::text` |
| `max_deviation_percent` | `numeric` | `YES` | *None* |
| `flagged_channels` | `jsonb` | `YES` | `'[]'::jsonb` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 rate_plans

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `plan_type` | `text` | `NO` | *None* |
| `base_rate` | `numeric` | `NO` | *None* |
| `currency` | `text` | `NO` | `'INR'::text` |
| `is_refundable` | `boolean` | `YES` | `true` |
| `cancellation_policy` | `jsonb` | `YES` | `'{}'::jsonb` |
| `min_stay_nights` | `integer` | `YES` | `1` |
| `max_stay_nights` | `integer` | `YES` | *None* |
| `advance_booking_days` | `integer` | `YES` | *None* |
| `blackout_dates` | `jsonb` | `YES` | `'[]'::jsonb` |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 recipe_ingredients

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `recipe_id` | `uuid` | `NO` | *None* |
| `inventory_item_id` | `uuid` | `NO` | *None* |
| `quantity` | `numeric` | `NO` | *None* |
| `unit` | `USER-DEFINED` | `NO` | *None* |
| `cost_per_unit` | `numeric` | `YES` | *None* |
| `total_cost` | `numeric` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `variant_id` | `uuid` | `YES` | *None* |


### 📋 recipes

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `category` | `USER-DEFINED` | `NO` | *None* |
| `prep_time_minutes` | `integer` | `YES` | *None* |
| `cook_time_minutes` | `integer` | `YES` | *None* |
| `difficulty` | `text` | `YES` | *None* |
| `serving_size` | `integer` | `NO` | `1` |
| `serving_unit` | `text` | `YES` | `'portion'::text` |
| `instructions` | `text` | `YES` | *None* |
| `image_url` | `text` | `YES` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `total_cost` | `numeric` | `YES` | `0` |
| `selling_price` | `numeric` | `YES` | `0` |
| `food_cost_percentage` | `numeric` | `YES` | `0` |
| `margin_percentage` | `numeric` | `YES` | `0` |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `menu_item_id` | `uuid` | `YES` | *None* |
| `recipe_type` | `text` | `YES` | `'menu_item'::text` |
| `output_inventory_item_id` | `uuid` | `YES` | *None* |
| `output_quantity` | `numeric` | `YES` | *None* |
| `output_unit` | `text` | `YES` | *None* |


### 📋 reservations

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `room_id` | `uuid` | `NO` | *None* |
| `customer_name` | `text` | `NO` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `customer_email` | `text` | `YES` | *None* |
| `start_time` | `timestamp with time zone` | `NO` | *None* |
| `end_time` | `timestamp with time zone` | `NO` | *None* |
| `status` | `text` | `YES` | `'confirmed'::text` |
| `notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `special_occasion` | `text` | `YES` | *None* |
| `special_occasion_date` | `date` | `YES` | *None* |
| `marketing_consent` | `boolean` | `YES` | `false` |
| `group_id` | `uuid` | `YES` | *None* |
| `group_name` | `text` | `YES` | *None* |
| `is_master_folio` | `boolean` | `YES` | `false` |
| `guest_tier` | `text` | `YES` | `'regular'::text` |
| `is_corporate` | `boolean` | `YES` | `false` |
| `company_name` | `text` | `YES` | *None* |
| `corporate_rate` | `numeric` | `YES` | *None* |
| `billing_address` | `text` | `YES` | *None* |
| `company_gst` | `text` | `YES` | *None* |


### 📋 restaurant_operating_hours

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `day_of_week` | `integer` | `NO` | *None* |
| `opening_time` | `time without time zone` | `NO` | *None* |
| `closing_time` | `time without time zone` | `NO` | *None* |
| `is_closed` | `boolean` | `NO` | `false` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 restaurant_settings

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `currency_id` | `uuid` | `YES` | *None* |
| `timezone` | `text` | `YES` | `'UTC'::text` |
| `date_format` | `text` | `YES` | `'DD/MM/YYYY'::text` |
| `time_format` | `text` | `YES` | `'24h'::text` |
| `backup_frequency` | `text` | `YES` | `'daily'::text` |
| `settings` | `jsonb` | `YES` | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `whatsapp_provider` | `text` | `NO` | `'msg91'::text` |
| `whatsapp_meta_config` | `jsonb` | `YES` | `'{}'::jsonb` |
| `kitchen_pin` | `text` | `YES` | *None* |


### 📋 restaurant_subscriptions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `plan_id` | `uuid` | `NO` | *None* |
| `status` | `text` | `YES` | `'active'::text` |
| `current_period_start` | `timestamp with time zone` | `NO` | *None* |
| `current_period_end` | `timestamp with time zone` | `NO` | *None* |
| `cancel_at_period_end` | `boolean` | `YES` | `false` |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `razorpay_order_id` | `text` | `YES` | *None* |
| `razorpay_payment_id` | `text` | `YES` | *None* |
| `razorpay_signature` | `text` | `YES` | *None* |
| `amount_paid` | `numeric` | `YES` | `0` |
| `currency` | `text` | `YES` | `'INR'::text` |
| `payment_method` | `text` | `YES` | *None* |
| `receipt` | `text` | `YES` | *None* |
| `paid_at` | `timestamp with time zone` | `YES` | *None* |
| `payment_notes` | `jsonb` | `YES` | `'{}'::jsonb` |
| `refund_id` | `text` | `YES` | *None* |
| `refund_status` | `text` | `YES` | `'none'::text` |
| `refund_amount` | `numeric` | `YES` | `0` |
| `refunded_at` | `timestamp with time zone` | `YES` | *None* |


### 📋 restaurant_tables

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `name` | `text` | `NO` | *None* |
| `capacity` | `integer` | `NO` | *None* |
| `status` | `text` | `YES` | `'available'::text` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |


### 📋 restaurants

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `name` | `text` | `NO` | *None* |
| `address` | `text` | `YES` | *None* |
| `phone` | `text` | `YES` | *None* |
| `email` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `website` | `text` | `YES` | *None* |
| `gstin` | `text` | `YES` | *None* |
| `registration_number` | `text` | `YES` | *None* |
| `license_number` | `text` | `YES` | *None* |
| `established_date` | `date` | `YES` | *None* |
| `cuisine_types` | `ARRAY` | `YES` | *None* |
| `seating_capacity` | `integer` | `YES` | *None* |
| `description` | `text` | `YES` | *None* |
| `operating_hours` | `jsonb` | `YES` | `'{}'::jsonb` |
| `social_media` | `jsonb` | `YES` | `'{}'::jsonb` |
| `delivery_radius_km` | `numeric` | `YES` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `verification_status` | `text` | `YES` | `'pending'::text` |
| `rating` | `numeric` | `YES` | `0.0` |
| `total_reviews` | `integer` | `YES` | `0` |
| `owner_name` | `text` | `YES` | *None* |
| `owner_email` | `text` | `YES` | *None* |
| `owner_phone` | `text` | `YES` | *None* |
| `owner_address` | `text` | `YES` | *None* |
| `owner_id_type` | `text` | `YES` | *None* |
| `owner_id_number` | `text` | `YES` | *None* |
| `emergency_contact_name` | `text` | `YES` | *None* |
| `emergency_contact_phone` | `text` | `YES` | *None* |
| `bank_name` | `text` | `YES` | *None* |
| `account_number` | `text` | `YES` | *None* |
| `ifsc_code` | `text` | `YES` | *None* |
| `pan_number` | `text` | `YES` | *None* |
| `upi_id` | `text` | `YES` | *None* |
| `payment_gateway_enabled` | `boolean` | `YES` | `false` |
| `slug` | `text` | `YES` | *None* |
| `qr_ordering_enabled` | `boolean` | `YES` | `false` |
| `qr_service_charge_percent` | `numeric` | `YES` | `0` |
| `qr_payment_required` | `boolean` | `YES` | `true` |
| `location_type` | `text` | `YES` | `'fixed'::text` |
| `current_location` | `text` | `YES` | *None* |
| `current_location_link` | `text` | `YES` | *None* |
| `weekly_schedule` | `jsonb` | `YES` | `'[]'::jsonb` |
| `location_updated_at` | `timestamp with time zone` | `YES` | *None* |
| `logo_url` | `text` | `YES` | *None* |


### 📋 revenue_metrics

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `date` | `date` | `NO` | *None* |
| `total_revenue` | `numeric` | `YES` | `0` |
| `room_revenue` | `numeric` | `YES` | `0` |
| `f_and_b_revenue` | `numeric` | `YES` | `0` |
| `occupancy_rate` | `numeric` | `YES` | `0` |
| `adr` | `numeric` | `YES` | `0` |
| `revpar` | `numeric` | `YES` | `0` |
| `total_rooms` | `integer` | `YES` | `0` |
| `occupied_rooms` | `integer` | `YES` | `0` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 role_components

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `role_id` | `uuid` | `NO` | *None* |
| `component_id` | `uuid` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 roles

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `name` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `is_deletable` | `boolean` | `YES` | `true` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |
| `is_system` | `boolean` | `YES` | `false` |
| `has_full_access` | `boolean` | `YES` | `false` |


### 📋 room_amenities

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `category` | `text` | `NO` | *None* |
| `cost_per_unit` | `numeric` | `YES` | `0` |
| `is_complimentary` | `boolean` | `YES` | `true` |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 room_amenity_inventory

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `room_id` | `uuid` | `NO` | *None* |
| `amenity_id` | `uuid` | `NO` | *None* |
| `quantity` | `integer` | `NO` | `1` |
| `condition` | `text` | `NO` | `'good'::text` |
| `last_checked` | `timestamp with time zone` | `YES` | `now()` |
| `notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 room_billings

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `reservation_id` | `uuid` | `NO` | *None* |
| `room_id` | `uuid` | `NO` | *None* |
| `customer_name` | `text` | `NO` | *None* |
| `days_stayed` | `integer` | `NO` | *None* |
| `room_charges` | `numeric` | `NO` | *None* |
| `service_charge` | `numeric` | `NO` | `0` |
| `additional_charges` | `jsonb` | `NO` | `'[]'::jsonb` |
| `total_amount` | `numeric` | `NO` | *None* |
| `payment_method` | `text` | `NO` | *None* |
| `payment_status` | `text` | `NO` | `'completed'::text` |
| `checkout_date` | `timestamp with time zone` | `NO` | `now()` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `whatsapp_sent` | `boolean` | `YES` | `false` |
| `food_orders_total` | `numeric` | `YES` | `0` |
| `food_orders_ids` | `ARRAY` | `YES` | *None* |
| `discount_amount` | `numeric` | `YES` | `0` |


### 📋 room_cleaning_schedules

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `room_id` | `uuid` | `NO` | *None* |
| `assigned_staff_id` | `uuid` | `YES` | *None* |
| `scheduled_date` | `date` | `NO` | *None* |
| `scheduled_time` | `time without time zone` | `NO` | *None* |
| `cleaning_type` | `text` | `NO` | `'standard'::text` |
| `status` | `text` | `NO` | `'pending'::text` |
| `estimated_duration` | `integer` | `NO` | `30` |
| `actual_start_time` | `timestamp with time zone` | `YES` | *None* |
| `actual_end_time` | `timestamp with time zone` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `checklist_completed` | `jsonb` | `YES` | `'[]'::jsonb` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `trigger_source` | `text` | `YES` | `'manual'::text` |
| `priority` | `text` | `YES` | `'normal'::text` |
| `reservation_id` | `uuid` | `YES` | *None* |
| `inspected_by` | `uuid` | `YES` | *None* |
| `inspected_at` | `timestamp with time zone` | `YES` | *None* |
| `room_condition_notes` | `text` | `YES` | *None* |
| `photos` | `jsonb` | `YES` | `'[]'::jsonb` |


### 📋 room_food_orders

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `room_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `customer_name` | `text` | `NO` | *None* |
| `items` | `jsonb` | `NO` | `'[]'::jsonb` |
| `total` | `numeric` | `NO` | `0` |
| `status` | `text` | `NO` | `'pending'::text` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `order_id` | `uuid` | `YES` | *None* |


### 📋 room_maintenance_requests

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `room_id` | `uuid` | `NO` | *None* |
| `reported_by` | `uuid` | `YES` | *None* |
| `assigned_to` | `uuid` | `YES` | *None* |
| `request_type` | `text` | `NO` | *None* |
| `priority` | `text` | `NO` | `'medium'::text` |
| `status` | `text` | `NO` | `'open'::text` |
| `title` | `text` | `NO` | *None* |
| `description` | `text` | `NO` | *None* |
| `estimated_cost` | `numeric` | `YES` | *None* |
| `actual_cost` | `numeric` | `YES` | *None* |
| `scheduled_date` | `date` | `YES` | *None* |
| `completed_date` | `timestamp with time zone` | `YES` | *None* |
| `images` | `jsonb` | `YES` | `'[]'::jsonb` |
| `notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 room_moves

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `check_in_id` | `uuid` | `YES` | *None* |
| `from_room_id` | `uuid` | `YES` | *None* |
| `to_room_id` | `uuid` | `YES` | *None* |
| `move_date` | `timestamp with time zone` | `YES` | `now()` |
| `reason` | `text` | `YES` | *None* |
| `rate_adjustment` | `numeric` | `YES` | `0` |
| `is_complimentary` | `boolean` | `YES` | `false` |
| `notes` | `text` | `YES` | *None* |
| `performed_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 room_waitlist

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `customer_name` | `text` | `NO` | *None* |
| `customer_phone` | `text` | `NO` | *None* |
| `customer_email` | `text` | `YES` | *None* |
| `preferred_room_type` | `text` | `YES` | *None* |
| `check_in_date` | `date` | `NO` | *None* |
| `check_out_date` | `date` | `NO` | *None* |
| `guests_count` | `integer` | `YES` | `1` |
| `status` | `text` | `YES` | `'waiting'::text` |
| `notes` | `text` | `YES` | *None* |
| `priority` | `integer` | `YES` | `0` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 rooms

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `capacity` | `integer` | `NO` | *None* |
| `status` | `text` | `YES` | `'available'::text` |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `price` | `numeric` | `NO` | `0` |


### 📋 sent_promotions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `promotion_id` | `uuid` | `YES` | *None* |
| `customer_name` | `text` | `NO` | *None* |
| `customer_phone` | `text` | `NO` | *None* |
| `customer_email` | `text` | `YES` | *None* |
| `reservation_id` | `uuid` | `YES` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `sent_date` | `timestamp with time zone` | `NO` | `now()` |
| `sent_status` | `text` | `NO` | `'pending'::text` |
| `sent_method` | `text` | `NO` | `'whatsapp'::text` |


### 📋 shared_bills

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `short_id` | `text` | `NO` | *None* |
| `bill_data` | `jsonb` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `tenant_id` | `uuid` | `YES` | *None* |


### 📋 shifts

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `uuid_generate_v4()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `start_time` | `time without time zone` | `NO` | *None* |
| `end_time` | `time without time zone` | `NO` | *None* |
| `color` | `text` | `YES` | `'#3B82F6'::text` |
| `grace_period_minutes` | `integer` | `YES` | `15` |
| `auto_clock_out_minutes` | `integer` | `YES` | `120` |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 split_bill_portions

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `split_bill_id` | `uuid` | `YES` | *None* |
| `payer_name` | `text` | `NO` | *None* |
| `payer_phone` | `text` | `YES` | *None* |
| `payer_email` | `text` | `YES` | *None* |
| `amount` | `numeric` | `NO` | *None* |
| `percentage` | `numeric` | `YES` | *None* |
| `payment_status` | `text` | `YES` | `'pending'::text` |
| `payment_method` | `text` | `YES` | *None* |
| `items` | `jsonb` | `YES` | *None* |
| `invoice_number` | `text` | `YES` | *None* |
| `paid_at` | `timestamp with time zone` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 split_bills

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `check_in_id` | `uuid` | `YES` | *None* |
| `original_amount` | `numeric` | `NO` | *None* |
| `split_method` | `text` | `YES` | `'percentage'::text` |
| `num_portions` | `integer` | `YES` | `2` |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 staff

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `first_name` | `text` | `NO` | *None* |
| `last_name` | `text` | `NO` | *None* |
| `position` | `text` | `YES` | *None* |
| `phone` | `text` | `YES` | *None* |
| `email` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `Shift` | `text` | `YES` | *None* |
| `status` | `text` | `YES` | `'active'::text` |
| `photo_url` | `text` | `YES` | *None* |
| `emergency_contact_name` | `text` | `YES` | *None* |
| `emergency_contact_phone` | `text` | `YES` | *None* |
| `start_date` | `date` | `YES` | *None* |
| `availability_notes` | `text` | `YES` | *None* |
| `role_ids` | `ARRAY` | `YES` | `'{}'::text[]` |
| `salary` | `numeric` | `YES` | *None* |
| `salary_type` | `character varying` | `YES` | `'monthly'::character varying` |
| `hire_date` | `date` | `YES` | *None* |
| `employment_type` | `character varying` | `YES` | `'full_time'::character varying` |
| `documents` | `jsonb` | `YES` | `'[]'::jsonb` |


### 📋 staff_documents

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `staff_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `document_type` | `text` | `NO` | *None* |
| `document_number` | `text` | `YES` | *None* |
| `document_name` | `text` | `NO` | *None* |
| `google_drive_file_id` | `text` | `YES` | *None* |
| `google_drive_url` | `text` | `YES` | *None* |
| `file_size` | `bigint` | `YES` | *None* |
| `mime_type` | `text` | `YES` | *None* |
| `is_verified` | `boolean` | `YES` | `false` |
| `uploaded_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 staff_leave_balances

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `staff_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `leave_type` | `text` | `NO` | *None* |
| `total_days` | `numeric` | `NO` | `0` |
| `used_days` | `numeric` | `NO` | `0` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 staff_leave_requests

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `staff_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `leave_type` | `text` | `NO` | *None* |
| `start_date` | `date` | `NO` | *None* |
| `end_date` | `date` | `NO` | *None* |
| `reason` | `text` | `YES` | *None* |
| `status` | `text` | `NO` | `'pending'::text` |
| `approved_by` | `uuid` | `YES` | *None* |
| `manager_comments` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 staff_leave_types

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `accrual_type` | `text` | `YES` | `'fixed'::text` |
| `accrual_amount` | `numeric` | `YES` | `0` |
| `accrual_period` | `text` | `YES` | `'annual'::text` |
| `requires_approval` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `days_per_year` | `integer` | `YES` | `0` |
| `description` | `text` | `YES` | *None* |
| `is_paid` | `boolean` | `YES` | `true` |
| `carry_forward` | `boolean` | `YES` | `false` |
| `max_carry_forward_days` | `integer` | `YES` | `0` |


### 📋 staff_leaves

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `staff_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `start_date` | `date` | `NO` | *None* |
| `end_date` | `date` | `NO` | *None* |
| `status` | `text` | `NO` | `'pending'::text` |
| `reason` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |


### 📋 staff_notifications

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `staff_id` | `uuid` | `NO` | *None* |
| `title` | `text` | `NO` | *None* |
| `message` | `text` | `NO` | *None* |
| `type` | `text` | `NO` | `'task_assigned'::text` |
| `reference_type` | `text` | `YES` | *None* |
| `reference_id` | `uuid` | `YES` | *None* |
| `is_read` | `boolean` | `YES` | `false` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 staff_roles

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `name` | `text` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `permissions` | `jsonb` | `YES` | `'[]'::jsonb` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 staff_shift_assignments

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `uuid_generate_v4()` |
| `staff_id` | `uuid` | `NO` | *None* |
| `shift_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `day_of_week` | `integer` | `NO` | *None* |
| `effective_from` | `date` | `YES` | `CURRENT_DATE` |
| `effective_until` | `date` | `YES` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 staff_shifts

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `staff_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `start_time` | `timestamp with time zone` | `NO` | *None* |
| `end_time` | `timestamp with time zone` | `NO` | *None* |
| `location` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 staff_time_clock

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `staff_id` | `uuid` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `clock_in` | `timestamp with time zone` | `NO` | *None* |
| `clock_out` | `timestamp with time zone` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `shift_id` | `uuid` | `YES` | *None* |
| `clock_in_status` | `text` | `YES` | *None* |
| `minutes_variance` | `integer` | `YES` | `0` |
| `auto_clocked_out` | `boolean` | `YES` | `false` |
| `manager_override` | `boolean` | `YES` | `false` |
| `override_by` | `uuid` | `YES` | *None* |
| `override_reason` | `text` | `YES` | *None* |


### 📋 storage_locations

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `character varying` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `location_type` | `character varying` | `YES` | `'dry_storage'::character varying` |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 subscription_discounts

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `restaurant_name` | `text` | `NO` | *None* |
| `plan_id` | `uuid` | `NO` | *None* |
| `discount_type` | `text` | `NO` | *None* |
| `discount_value` | `numeric` | `NO` | *None* |
| `original_price` | `numeric` | `NO` | *None* |
| `discounted_price` | `numeric` | `NO` | *None* |
| `discount_amount` | `numeric` | `NO` | *None* |
| `discount_percentage` | `numeric` | `YES` | *None* |
| `razorpay_payment_link_id` | `text` | `YES` | *None* |
| `razorpay_payment_link_url` | `text` | `YES` | *None* |
| `razorpay_payment_link_status` | `text` | `YES` | `'created'::text` |
| `whatsapp_sent` | `boolean` | `YES` | `false` |
| `whatsapp_sent_at` | `timestamp with time zone` | `YES` | *None* |
| `status` | `text` | `YES` | `'active'::text` |
| `expires_at` | `timestamp with time zone` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 subscription_plans

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `name` | `text` | `NO` | *None* |
| `description` | `text` | `YES` | *None* |
| `price` | `numeric` | `NO` | *None* |
| `interval` | `USER-DEFINED` | `NO` | *None* |
| `features` | `jsonb` | `YES` | `'[]'::jsonb` |
| `is_active` | `boolean` | `YES` | `true` |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `components` | `jsonb` | `YES` | `'[]'::jsonb` |
| `components_backup` | `jsonb` | `YES` | *None* |


### 📋 supplier_order_items

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `order_id` | `uuid` | `NO` | *None* |
| `inventory_item_id` | `uuid` | `NO` | *None* |
| `quantity` | `numeric` | `NO` | *None* |
| `unit_price` | `numeric` | `NO` | *None* |
| `total_price` | `numeric` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |


### 📋 supplier_orders

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `supplier_id` | `uuid` | `NO` | *None* |
| `order_date` | `timestamp with time zone` | `NO` | *None* |
| `status` | `text` | `YES` | `'pending'::text` |
| `total_amount` | `numeric` | `YES` | `0` |
| `notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |


### 📋 supplier_price_history

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `supplier_id` | `uuid` | `NO` | *None* |
| `inventory_item_id` | `uuid` | `NO` | *None* |
| `unit_price` | `numeric` | `NO` | *None* |
| `quantity` | `numeric` | `YES` | *None* |
| `recorded_at` | `timestamp with time zone` | `YES` | `now()` |
| `purchase_order_id` | `uuid` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |


### 📋 suppliers

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `contact_person` | `text` | `YES` | *None* |
| `phone` | `text` | `YES` | *None* |
| `email` | `text` | `YES` | *None* |
| `address` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `updated_at` | `timestamp with time zone` | `NO` | `timezone('utc'::text, now())` |
| `payment_terms` | `text` | `YES` | `'net_30'::text` |
| `lead_time_days` | `integer` | `YES` | `7` |
| `minimum_order_amount` | `numeric` | `YES` | `0` |
| `is_active` | `boolean` | `YES` | `true` |


### 📋 sync_logs

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `channel_id` | `uuid` | `YES` | *None* |
| `sync_type` | `text` | `NO` | *None* |
| `direction` | `text` | `NO` | `'outbound'::text` |
| `status` | `text` | `NO` | `'started'::text` |
| `records_processed` | `integer` | `YES` | `0` |
| `records_failed` | `integer` | `YES` | `0` |
| `error_details` | `jsonb` | `YES` | `'[]'::jsonb` |
| `request_payload` | `jsonb` | `YES` | *None* |
| `response_payload` | `jsonb` | `YES` | *None* |
| `http_status_code` | `integer` | `YES` | *None* |
| `duration_ms` | `integer` | `YES` | *None* |
| `triggered_by` | `text` | `YES` | `'system'::text` |
| `started_at` | `timestamp with time zone` | `YES` | `now()` |
| `completed_at` | `timestamp with time zone` | `YES` | *None* |


### 📋 sync_retry_queue

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `channel_id` | `uuid` | `NO` | *None* |
| `sync_log_id` | `uuid` | `YES` | *None* |
| `sync_type` | `text` | `NO` | *None* |
| `payload` | `jsonb` | `NO` | *None* |
| `response_payload` | `jsonb` | `YES` | *None* |
| `attempts` | `integer` | `YES` | `0` |
| `max_retries` | `integer` | `YES` | `5` |
| `next_retry_at` | `timestamp with time zone` | `YES` | `now()` |
| `backoff_seconds` | `integer` | `YES` | `5` |
| `status` | `text` | `YES` | `'pending'::text` |
| `error_message` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `resolved_at` | `timestamp with time zone` | `YES` | *None* |


### 📋 table_availability_slots

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `table_id` | `uuid` | `NO` | *None* |
| `date` | `date` | `NO` | *None* |
| `time_slot` | `time without time zone` | `NO` | *None* |
| `is_available` | `boolean` | `NO` | `true` |
| `max_party_size` | `integer` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 table_reservations

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `table_id` | `uuid` | `NO` | *None* |
| `customer_name` | `text` | `NO` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `customer_email` | `text` | `YES` | *None* |
| `party_size` | `integer` | `NO` | *None* |
| `reservation_date` | `date` | `NO` | *None* |
| `reservation_time` | `time without time zone` | `NO` | *None* |
| `duration_minutes` | `integer` | `NO` | `120` |
| `status` | `text` | `NO` | `'confirmed'::text` |
| `special_requests` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |
| `notes` | `text` | `YES` | *None* |
| `arrival_time` | `timestamp with time zone` | `YES` | *None* |
| `departure_time` | `timestamp with time zone` | `YES` | *None* |
| `confirmation_sent` | `boolean` | `YES` | `false` |
| `confirmation_sent_at` | `timestamp with time zone` | `YES` | *None* |
| `reminder_sent` | `boolean` | `YES` | `false` |
| `reminder_sent_at` | `timestamp with time zone` | `YES` | *None* |
| `confirmation_method` | `text` | `YES` | *None* |


### 📋 tax_configurations

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `tax_name` | `text` | `NO` | *None* |
| `tax_rate` | `numeric` | `NO` | *None* |
| `tax_type` | `text` | `NO` | *None* |
| `is_active` | `boolean` | `YES` | `true` |
| `description` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 unified_orders

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `YES` | *None* |
| `restaurant_id` | `uuid` | `YES` | *None* |
| `customer_name` | `text` | `YES` | *None* |
| `items_text` | `ARRAY` | `YES` | *None* |
| `total` | `numeric` | `YES` | *None* |
| `discount_amount` | `numeric` | `YES` | *None* |
| `discount_percentage` | `numeric` | `YES` | *None* |
| `status` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | *None* |
| `updated_at` | `timestamp with time zone` | `YES` | *None* |
| `source` | `text` | `YES` | *None* |
| `order_type` | `text` | `YES` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `reservation_id` | `uuid` | `YES` | *None* |
| `payment_status` | `text` | `YES` | *None* |
| `attendant` | `text` | `YES` | *None* |
| `kitchen_order_id` | `uuid` | `YES` | *None* |
| `items_jsonb` | `jsonb` | `YES` | *None* |
| `item_completion_status` | `jsonb` | `YES` | *None* |
| `priority` | `text` | `YES` | *None* |
| `station` | `text` | `YES` | *None* |
| `estimated_prep_time` | `integer` | `YES` | *None* |
| `started_at` | `timestamp with time zone` | `YES` | *None* |
| `completed_at` | `timestamp with time zone` | `YES` | *None* |
| `bumped_at` | `timestamp with time zone` | `YES` | *None* |
| `server_name` | `text` | `YES` | *None* |
| `kitchen_status` | `text` | `YES` | *None* |


### 📋 user_roles

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `user_id` | `uuid` | `NO` | *None* |
| `role` | `USER-DEFINED` | `NO` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 waitlist

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `customer_name` | `text` | `NO` | *None* |
| `customer_phone` | `text` | `YES` | *None* |
| `customer_email` | `text` | `YES` | *None* |
| `party_size` | `integer` | `NO` | *None* |
| `status` | `text` | `NO` | `'waiting'::text` |
| `priority` | `integer` | `YES` | `0` |
| `estimated_wait_time` | `integer` | `YES` | *None* |
| `check_in_time` | `timestamp with time zone` | `NO` | `now()` |
| `seated_time` | `timestamp with time zone` | `YES` | *None* |
| `notes` | `text` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |


### 📋 whatsapp_campaign_sends

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `campaign_id` | `uuid` | `YES` | *None* |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `customer_id` | `uuid` | `YES` | *None* |
| `customer_phone` | `text` | `NO` | *None* |
| `customer_name` | `text` | `NO` | *None* |
| `template_name` | `text` | `NO` | `'invoice_with_contact'::text` |
| `msg91_request_id` | `text` | `YES` | *None* |
| `status` | `text` | `YES` | `'pending'::text` |
| `failure_reason` | `text` | `YES` | *None* |
| `sent_at` | `timestamp with time zone` | `YES` | `now()` |
| `delivered_at` | `timestamp with time zone` | `YES` | *None* |
| `read_at` | `timestamp with time zone` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |


### 📋 whatsapp_templates

| Column Name | Data Type | Nullable | Default Value |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `restaurant_id` | `uuid` | `NO` | *None* |
| `name` | `text` | `NO` | *None* |
| `display_name` | `text` | `NO` | *None* |
| `category` | `text` | `NO` | `'UTILITY'::text` |
| `language` | `text` | `NO` | `'en'::text` |
| `body` | `text` | `NO` | *None* |
| `variables` | `jsonb` | `YES` | `'[]'::jsonb` |
| `header_text` | `text` | `YES` | *None* |
| `footer_text` | `text` | `YES` | *None* |
| `buttons` | `jsonb` | `YES` | `'[]'::jsonb` |
| `status` | `text` | `NO` | `'draft'::text` |
| `admin_notes` | `text` | `YES` | *None* |
| `meta_response` | `jsonb` | `YES` | *None* |
| `is_default` | `boolean` | `YES` | `false` |
| `created_by` | `uuid` | `YES` | *None* |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `updated_at` | `timestamp with time zone` | `YES` | `now()` |


## ⚙️ 2. Database Functions (RPCs) Reference

The Supabase project exposes the following database functions for security, utility, business logic, and reporting.

| Function | Argument Signature | Return Type | Description / Intent |
|---|---|---|---|
| `add_customer_activity` | `customer_id_param uuid, restaurant_id_param uuid, activity_type_param text, description_param text` | `SETOF customer_activities` | Creates a new entry in customer activity log. |
| `add_customer_note` | `customer_id_param uuid, restaurant_id_param uuid, content_param text, created_by_param text` | `SETOF customer_notes` | Appends a note to customer profile. |
| `add_loyalty_transaction` | `customer_id_param uuid, restaurant_id_param uuid, transaction_type_param text, points_param integer, source_param text, notes_param text, created_by_param uuid` | `SETOF loyalty_transactions` | Dispatches loyalty points change event. |
| `audit_log_changes` | _None_ | `trigger` | Writes audited actions to `audit_logs` (inserted on INSERT, UPDATE, DELETE triggers). |
| `auto_expire_promotion_campaigns` | _None_ | `void` | Cron utility that marks campaigns as expired if past `end_date`. |
| `bump_kitchen_order_by_pin` | `p_order_id uuid, p_restaurant_id uuid, p_pin text` | `void` | Completes kitchen order on KDS screen (verifies kitchen pin). |
| `calculate_customer_tier` | `customer_points integer, restaurant_id_param uuid` | `uuid` | Returns appropriate loyalty tier ID based on points threshold. |
| `calculate_recipe_cost` | _None_ | `trigger` | Trigger calculating menu recipe costs automatically on changes. |
| `capture_supplier_price_on_po_receive` | _None_ | `trigger` | Saves historical prices on PO item intake. |
| `check_access` | `_table_name text, _restaurant_id uuid` | `boolean` | Gating helper for component-to-table access. |
| `check_kitchen_pin_exists` | `p_restaurant_id uuid` | `boolean` | Verifies whether a restaurant has set their kitchen access PIN. |
| `expire_loyalty_points` | _None_ | `void` | Point cleanup cron worker. |
| `fn_on_new_ota_booking` | _None_ | `trigger` | Handles booking confirmations from OTAs. |
| `fn_on_ota_booking_cancel` | _None_ | `trigger` | Clears room availability upon cancellation. |
| `fn_update_cms_timestamp` | _None_ | `trigger` | Updates `updated_at` on channel management tables. |
| `generate_purchase_order_number` | `restaurant_id_param uuid` | `text` | Returns sequentially formatted PO number. |
| `generate_restaurant_slug` | _None_ | `trigger` | Trigger auto-slugifying restaurant names. |
| `generate_time_slots_for_date` | `p_restaurant_id uuid, p_date date, p_slot_duration_minutes integer` | `TABLE(time_slot time)` | Returns array of open time slots for table booking. |
| `get_active_restaurants` | _None_ | `TABLE(id uuid, name text)` | Lists active restaurant tenants. |
| `get_analytics_data` | `p_restaurant_id uuid, p_start_date text, p_end_date text` | `jsonb` | High-performance reporting aggregator. |
| `get_customer_activities` | `customer_id_param uuid` | `SETOF customer_activities` | Retrieves client history timeline. |
| `get_customer_notes` | `customer_id_param uuid` | `SETOF customer_notes` | Retrieves customer notes. |
| `get_kitchen_orders_by_pin` | `p_restaurant_id uuid, p_pin text` | `TABLE(id uuid, ...)` | Secure listing of active kitchen orders (requires PIN check). |
| `get_loyalty_transactions` | `customer_id_param uuid` | `SETOF loyalty_transactions` | Returns points history ledger. |
| `get_user_components` | `user_id uuid` | `TABLE(component_name text)` | Fetches accessible client-side paths. |
| `get_user_permissions` | `p_user_id uuid` | `TABLE(permission text)` | Pulls all custom permissions for users. |
| `get_user_restaurant_id` | `_user_id uuid` | `uuid` | Resolves tenant ID. |
| `get_user_role_name` | `user_id uuid` | `text` | Returns role name string. |
| `handle_new_user` | _None_ | `trigger` | Auto-profiles signup accounts. |
| `handle_order_status_update` | _None_ | `trigger` | Lifecycle handler for order status transitions. |
| `has_active_subscription` | `restaurant_id uuid` | `boolean` | Returns subscription status validation. |
| `has_any_role` | `_user_id uuid, _roles text[]` | `boolean` | Role auth assertion. |
| `has_role` | `_user_id uuid, _role user_role` | `boolean` | Specific role assertion. |
| `is_platform_admin` | _None_ | `boolean` | Super admin authorization. |
| `moddatetime` | _None_ | `trigger` | Utility to auto-populate `updated_at`. |
| `notify_expiring_loyalty_points` | `p_days_before integer` | `void` | Triggers alert dispatch for points expiry. |
| `reset_notification_sent` | _None_ | `trigger` | Resets notification triggers when stock goes above threshold. |
| `rls_auto_enable` | _None_ | `event_trigger` | Super-admin event worker auto-securing new tables with RLS. |
| `seed_default_roles_for_restaurant` | _None_ | `trigger` | Seeder for fresh tenant roles. |
| `seed_system_roles` | `p_restaurant_id uuid` | `void` | Seeder tool for default platform permissions. |
| `set_kitchen_pin_by_owner` | `p_restaurant_id uuid, p_new_pin text` | `boolean` | Updates/creates kitchen verification PIN. |
| `suggest_purchase_orders` | `restaurant_id_param uuid` | `TABLE(...)` | Auto-orders calculations. |
| `sync_auth_user_email_to_profile` | _None_ | `trigger` | Auth-profile email sync. |
| `sync_kitchen_to_orders` | _None_ | `trigger` | KDS-to-POS updates synchronization. |
| `sync_order_to_customer` | _None_ | `trigger` | Updates customer spent stats and loyalty points when order paid. |
| `sync_orders_status_from_kitchen` | _None_ | `trigger` | Back-sync KDS status to master order table. |
| `sync_orders_to_kitchen` | _None_ | `trigger` | Syncs new/modified orders to KDS. |
| `update_customer_loyalty_tier` | _None_ | `trigger` | Upgrades/downgrades customer loyalty tiers. |
| `update_daily_revenue_stats` | _None_ | `trigger` | Re-aggregates daily sales logs. |
| `update_inventory_from_purchase_order` | _None_ | `trigger` | Deducts/adds quantities upon PO entry. |
| `update_is_b2b` | _None_ | `trigger` | Invoice tax classification. |
| `update_kitchen_item_complete_by_pin` | `p_order_id uuid, p_restaurant_id uuid, p_pin text, p_item_completion_status jsonb` | `void` | Mark specific dish as prepped inside kitchen order. |
| `update_kitchen_order_items_by_pin` | `p_order_id uuid, p_restaurant_id uuid, p_pin text, p_items jsonb, p_item_completion_status jsonb` | `void` | Modifies items in active kitchen order. |
| `update_kitchen_order_priority_by_pin` | `p_order_id uuid, p_restaurant_id uuid, p_pin text, p_priority text` | `void` | Adjusts priority levels (vip/rush). |
| `update_kitchen_order_status_by_pin` | `p_order_id uuid, p_restaurant_id uuid, p_pin text, p_status text, p_started_at text, p_completed_at text` | `void` | Transitions KDS status. |
| `update_loyalty_updated_at` | _None_ | `trigger` | Timestamp helper. |
| `update_payment_transaction_timestamp` | _None_ | `trigger` | Timestamp helper. |
| `update_pos_transactions_updated_at` | _None_ | `trigger` | Timestamp helper. |
| `update_restaurants_updated_at` | _None_ | `trigger` | Timestamp helper. |
| `update_roles_updated_at` | _None_ | `trigger` | Timestamp helper. |
| `update_room_status` | _None_ | `trigger` | Syncs room availability flag on check-in/out. |
| `update_table_status_from_reservations` | _None_ | `trigger` | Marks restaurant table occupied on reservation check-in. |
| `update_updated_at_column` | _None_ | `trigger` | Timestamp helper. |
| `user_has_role_or_permission` | `required_roles text[], required_permissions text[]` | `boolean` | Access check helper. |
| `user_has_table_access` | `_user_id uuid, _table_name text, _restaurant_id uuid` | `boolean` | Complex RLS permissions evaluator. |
| `user_is_admin` | `user_id uuid` | `boolean` | Checks admin role status. |
| `user_is_admin_or_owner` | `user_id uuid` | `boolean` | Checks admin/owner status. |
| `verify_kitchen_pin` | `p_restaurant_id uuid, p_pin text` | `boolean` | Asserts KDS PIN correctness. |

---

## ⚡ 3. Database Triggers Reference

Triggers enforce data automation, calculations, auditing, and realtime state synchronization.

| Trigger Name | Table | Event | Execution |
|---|---|---|---|
| `update_backup_settings_updated_at` | `backup_settings` | `UPDATE` | `update_updated_at_column()` |
| `update_batch_productions_updated_at` | `batch_productions` | `UPDATE` | `update_updated_at_column()` |
| `update_booking_channels_updated_at` | `booking_channels` | `UPDATE` | `update_updated_at_column()` |
| `update_budget_line_items_updated_at` | `budget_line_items` | `UPDATE` | `update_updated_at_column()` |
| `update_budgets_updated_at` | `budgets` | `UPDATE` | `update_updated_at_column()` |
| `handle_updated_at` | `categories` | `UPDATE` | `moddatetime()` |
| `trg_channel_rate_rules_updated` | `channel_rate_rules` | `UPDATE` | `fn_update_cms_timestamp()` |
| `trg_channel_restrictions_updated` | `channel_restrictions` | `UPDATE` | `fn_update_cms_timestamp()` |
| `trg_channel_room_mapping_updated` | `channel_room_mapping` | `UPDATE` | `fn_update_cms_timestamp()` |
| `update_chart_of_accounts_updated_at` | `chart_of_accounts` | `UPDATE` | `update_updated_at_column()` |
| `update_check_ins_updated_at` | `check_ins` | `UPDATE` | `update_updated_at_column()` |
| `update_currencies_updated_at` | `currencies` | `UPDATE` | `update_updated_at_column()` |
| `update_customer_tier_on_points_change` | `customers` | `UPDATE` | `update_customer_loyalty_tier()` |
| `audit_expenses` | `expenses` | `INSERT`, `UPDATE`, `DELETE` | `audit_log_changes()` |
| `update_expenses_updated_at` | `expenses` | `UPDATE` | `update_updated_at_column()` |
| `update_guest_profiles_updated_at` | `guest_profiles` | `UPDATE` | `update_updated_at_column()` |
| `audit_inventory_items` | `inventory_items` | `INSERT`, `UPDATE`, `DELETE` | `audit_log_changes()` |
| `reset_notification_sent_trigger` | `inventory_items` | `UPDATE` | `reset_notification_sent()` |
| `trigger_update_is_b2b` | `invoices` | `INSERT`, `UPDATE` | `update_is_b2b()` |
| `update_invoices_updated_at` | `invoices` | `UPDATE` | `update_updated_at_column()` |
| `update_journal_entries_updated_at` | `journal_entries` | `UPDATE` | `update_updated_at_column()` |
| `trg_sync_orders_status_from_kitchen` | `kitchen_orders` | `INSERT`, `UPDATE` | `sync_orders_status_from_kitchen()` |
| `update_kitchen_orders_updated_at` | `kitchen_orders` | `UPDATE` | `update_updated_at_column()` |
| `update_loyalty_programs_timestamp` | `loyalty_programs` | `UPDATE` | `update_loyalty_updated_at()` |
| `update_loyalty_rewards_timestamp` | `loyalty_rewards` | `UPDATE` | `update_loyalty_updated_at()` |
| `update_loyalty_tiers_timestamp` | `loyalty_tiers` | `UPDATE` | `update_loyalty_updated_at()` |
| `update_monthly_budgets_updated_at` | `monthly_budgets` | `UPDATE` | `update_updated_at_column()` |
| `update_operational_costs_updated_at` | `operational_costs` | `UPDATE` | `update_updated_at_column()` |
| `audit_orders` | `orders` | `INSERT`, `UPDATE`, `DELETE` | `audit_log_changes()` |
| `orders_stats_trigger` | `orders` | `INSERT`, `UPDATE`, `DELETE` | `update_daily_revenue_stats()` |
| `tr_orders_status_update` | `orders` | `UPDATE` | `handle_order_status_update()` |
| `trg_sync_order_to_customer` | `orders` | `INSERT` | `sync_order_to_customer()` |
| `update_orders_unified_updated_at` | `orders_unified` | `UPDATE` | `update_updated_at_column()` |
| `trg_ota_booking_cancel` | `ota_bookings` | `UPDATE` | `fn_on_ota_booking_cancel()` |
| `trg_ota_booking_inventory` | `ota_bookings` | `INSERT` | `fn_on_new_ota_booking()` |
| `trg_ota_bookings_updated` | `ota_bookings` | `UPDATE` | `fn_update_cms_timestamp()` |
| `trg_ota_credentials_updated` | `ota_credentials` | `UPDATE` | `fn_update_cms_timestamp()` |
| `update_payment_methods_updated_at` | `payment_methods` | `UPDATE` | `update_updated_at_column()` |
| `update_payment_settings_updated_at` | `payment_settings` | `UPDATE` | `update_updated_at_column()` |
| `payment_transaction_status_change` | `payment_transactions` | `UPDATE` | `update_payment_transaction_timestamp()` |
| `update_payments_updated_at` | `payments` | `UPDATE` | `update_updated_at_column()` |
| `trg_pool_inventory_updated` | `pool_inventory` | `UPDATE` | `fn_update_cms_timestamp()` |
| `update_pos_transactions_updated_at` | `pos_transactions` | `UPDATE` | `update_pos_transactions_updated_at()` |
| `update_pricing_rules_updated_at` | `pricing_rules` | `UPDATE` | `update_updated_at_column()` |
| `seed_roles_on_profile_insert` | `profiles` | `INSERT` | `seed_default_roles_for_restaurant()` |
| `seed_roles_on_profile_update` | `profiles` | `UPDATE` | `seed_default_roles_for_restaurant()` |
| `update_promotion_campaigns_updated_at` | `promotion_campaigns` | `UPDATE` | `update_updated_at_column()` |
| `trigger_update_inventory_from_purchase_order` | `purchase_order_items` | `UPDATE` | `update_inventory_from_purchase_order()` |
| `trg_capture_supplier_price` | `purchase_orders` | `UPDATE` | `capture_supplier_price_on_po_receive()` |
| `update_purchase_orders_updated_at` | `purchase_orders` | `UPDATE` | `update_updated_at_column()` |
| `update_rate_plans_updated_at` | `rate_plans` | `UPDATE` | `update_updated_at_column()` |
| `trigger_calculate_recipe_cost` | `recipe_ingredients` | `INSERT`, `UPDATE`, `DELETE` | `calculate_recipe_cost()` |
| `update_recipe_ingredients_updated_at` | `recipe_ingredients` | `UPDATE` | `update_updated_at_column()` |
| `update_recipes_updated_at` | `recipes` | `UPDATE` | `update_updated_at_column()` |
| `after_reservation_insert` | `reservations` | `INSERT` | `update_room_status()` |
| `update_restaurant_settings_updated_at` | `restaurant_settings` | `UPDATE` | `update_updated_at_column()` |
| `update_restaurant_subscriptions_updated_at`| `restaurant_subscriptions`| `UPDATE` | `update_updated_at_column()` |
| `set_restaurant_slug` | `restaurants` | `INSERT`, `UPDATE` | `generate_restaurant_slug()` |
| `update_restaurants_updated_at_trigger` | `restaurants` | `UPDATE` | `update_restaurants_updated_at()` |
| `update_revenue_metrics_updated_at` | `revenue_metrics` | `UPDATE` | `update_updated_at_column()` |
| `update_roles_timestamp` | `roles` | `UPDATE` | `update_roles_updated_at()` |
| `update_room_food_orders_updated_at` | `room_food_orders` | `UPDATE` | `update_updated_at_column()` |
| `audit_staff` | `staff` | `INSERT`, `UPDATE`, `DELETE` | `audit_log_changes()` |
| `update_staff_documents_updated_at` | `staff_documents` | `UPDATE` | `update_updated_at_column()` |
| `update_subscription_plans_updated_at` | `subscription_plans` | `UPDATE` | `update_updated_at_column()` |
| `update_suppliers_updated_at` | `suppliers` | `UPDATE` | `update_updated_at_column()` |
| `trigger_update_table_status` | `table_reservations` | `INSERT`, `UPDATE` | `update_table_status_from_reservations()` |
| `update_tax_configurations_updated_at` | `tax_configurations` | `UPDATE` | `update_updated_at_column()` |
| `update_waitlist_updated_at` | `waitlist` | `UPDATE` | `update_updated_at_column()` |

---

## ⚡ 4. Supabase Edge Functions Reference

These serverless Deno functions run in the background, handling payment gates, messaging APIs, background syncs, AI, and complex calculations.

### 💳 Payments
* `create-razorpay-order`: Generates Razorpay transaction token for subscription purchases.
* `verify-razorpay-payment`: Validates webhooks/redirects from Razorpay to activate subscriptions.
* `process-razorpay-refund`: Cancels and refunds subscriptions.
* `create-paytm-qr`: Generates Paytm dynamic UPI QR code for order checkouts.
* `check-paytm-status`: Polls status of Paytm transaction.
* `paytm-webhook`: Handles Paytm payment success webhook.
* `create-payment-qr`: General QR generation gateway.

### ✉️ Messaging, Notification & Webhooks
* `send-email`: Dispatches notifications using Resend.
* `send-email-bill`: Dispatches email receipt to customers.
* `send-inquiry`: Relays customer messages from the public landing site.
* `send-whatsapp`: General WhatsApp notification channel.
* `send-whatsapp-bill`: Dispatches PDF bill URL to client's phone via MSG91/Cloud WhatsApp.
* `send-whatsapp-cloud`: Standard WhatsApp Cloud API helper.
* `send-msg91-whatsapp`: MSG91 gateway integration.
* `send-reservation-confirmation`: Sends stay/table confirmation message.
* `send-reservation-reminder`: Pre-arrival notification dispatch.
* `send-subscription-confirmation`: Dispatches subscription receipts.
* `whatsapp-webhook`: Listens to incoming WhatsApp customer answers.
* `create-msg91-template`: Creates MSG91 messaging templates.
* `sync-msg91-template-status`: Syncs template review status.

### 🍕 Kitchen & Restaurant Operations
* `deduct-inventory-on-prep`: Triggered by kitchen KDS to decrease stock levels according to recipe ingredients when prep starts.
* `check-low-stock`: Checks stock vs reorder level and sends alerts.
* `submit-qr-order`: Validates cart items, price, session token and inserts client QR order.
* `customer-menu-api`: Serves restaurant menu dynamically for QR ordering.
* `find-active-reservation`: Validates reservation code at POS.

### 👤 HR & Access Control
* `record-clock-entry`: Secure clock-in/out registration with IP & location bounds.
* `auto-clock-out`: Overnight cron that automatically clocks out active staff who forgot.
* `check-missed-clocks`: Audit worker searching for shifts missing clock entries.
* `get-user-components`: Resolves UI paths allowed for a user role.
* `role-management`: Custom role settings portal.
* `user-management`: Platform-wide member onboarding.
* `migrate-roles-data`: System migrations helper.
* `invite-franchise-owner`: Sends branch onboarding invitations.

### 📄 Utility & File Management
* `upload-image`: Uploads images directly to Supabase storage buckets.
* `freeimage-upload`: Public image upload gateway.
* `google-drive-upload`: Platform backup uploader.
* `extract-bill-details`: AI-powered optical character recognition (OCR) extracting items/totals from uploaded invoice PDFs/images to auto-fill purchase orders.
* `generate-qr-code`: Basic QR generation service.
* `backup-restore`: Exporters for system configurations.
* `sync-channels`: Channel manager trigger syncing HMS availability to OTAs.
* `validate-promo-code`: Promo code checking.
* `log-promotion-usage`: Tracks promotion success statistics.
* `enroll-customer`: Enrolls client in loyalty program.
* `forgot-password` / `reset-password`: Account recovery helpers.

---

## 👁️ 5. Database Views Reference

* **[profiles_with_role](file:///g:/restaurant/Sudip/tasty-bite-harbor/src/integrations/supabase/types.ts)**: Combined view of user profiles with their designated system role details.
* **[customer_insights](file:///g:/restaurant/Sudip/tasty-bite-harbor/src/integrations/supabase/types.ts)**: Pre-aggregated metrics for CRM analytics (totals spent, average order values, visit frequency).
* **[unified_orders](file:///g:/restaurant/Sudip/tasty-bite-harbor/src/integrations/supabase/types.ts)**: View compiling orders from various source channels into a uniform layout.

---

## ⏰ 6. Active Database Cron Jobs (pg_cron)

These scheduled jobs trigger background automation, syncing channels, checking parity, expiring campaigns, and cleaning up loyalty metrics.

| Job Name | Schedule | Target / Command | Description |
|---|---|---|---|
| `channel-auto-sync-15min` | `*/15 * * * *` | HTTP POST to `/functions/v1/sync-channels` | Triggers Deno Edge function to push HMS room availability changes to connected booking channels/OTAs. |
| `retry-queue-processor-5min` | `*/5 * * * *` | Sync retry handler | Automatically processes any failed OTA sync updates with an exponential backoff retry. |
| `rate-parity-check-daily` | `0 6 * * *` | Rate parity audit | Daily audit executing at 06:00 to verify OTA pricing vs base rates and flag any parity violations. |
| `auto-expire-campaigns` | `5 0 * * *` | `public.auto_expire_promotion_campaigns()` | Daily cleanup marking promotion campaigns as expired if their end date has passed. |
| `expire-loyalty-points-daily` | `30 20 * * *` | `public.expire_loyalty_points()` | Nightly cron expiring customer points older than retention windows. |
| `notify-loyalty-expiry-7days` | `0 4 * * *` | `public.notify_expiring_loyalty_points(7)` | Notifies customers whose loyalty points expire in 7 days. |
| `notify-loyalty-expiry-3days` | `5 4 * * *` | `public.notify_expiring_loyalty_points(3)` | Notifies customers whose loyalty points expire in 3 days. |

---

## 🪣 7. Supabase Storage Buckets

Storage buckets host document uploads, receipts, images, and backups.

* **receipts** (Public): Stores checkout receipts and bills generated.
* **subscription-invoices** (Public): Specifically hosts billing invoices.
* **images** (Public): Hosts menu items, variants, and branding images.
* **backups** (Private): Hosts encrypted database dump snapshots.

---

## 🔌 8. PostgreSQL Extensions

The following Postgres extensions are enabled to extend database capabilities:

* `pg_cron`: Schedules and runs database commands/cron jobs.
* `pg_net`: Dispatches asynchronous HTTP/HTTPS requests from Postgres triggers.
* `uuid-ossp`: Generates UUID v4 identifiers.
* `pgcrypto`: Cryptographic hashing and helper functions.
* `pgjwt`: JSON Web Token generation and validation.
* `pgsodium`: Cryptographic and key management services.
* `pg_stat_statements`: Query performance monitoring.
* `supabase_vault`: Secure storage of API credentials and keys.
* `hypopg`: Hypothetical indexes for performance tuning.
* `index_advisor`: Automatic index recommendations.
