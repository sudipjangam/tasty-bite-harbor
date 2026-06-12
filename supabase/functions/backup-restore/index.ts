import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// All 61 tables in dependency order (parents first)
const ALL_TABLES_ORDERED = [
  // Core Settings
  'restaurant_settings',
  'payment_settings',
  'payment_methods',
  'shift_types',
  'shifts',
  'qr_codes',
  
  // Menu & Recipes
  'categories',
  'menu_items',
  'menu_item_variants',
  'recipes',
  'recipe_ingredients',
  'batch_productions',
  'homemade_production_logs',
  'homemade_production_log_items',

  // Inventory & Suppliers
  'storage_locations',
  'inventory_items',
  'inventory_lots',
  'inventory_transactions',
  'inventory_alerts',
  'suppliers',
  'purchase_orders',
  'purchase_order_items',

  // Staff & HR
  'staff',
  'staff_shifts',
  'staff_shift_assignments',
  'staff_time_clock',
  'staff_leaves',
  'staff_leave_requests',
  'staff_documents',
  'staff_notifications',

  // Guests & Loyalty
  'customers',
  'loyalty_programs',
  'loyalty_tiers',
  'loyalty_enrollments',
  'loyalty_transactions',
  'guest_profiles',
  'guest_loyalty',

  // Rooms & Housekeeping
  'rooms',
  'check_ins',
  'room_billings',
  'room_food_orders',
  'room_cleaning_schedules',
  'room_maintenance_requests',
  'room_moves',
  'room_waitlist',
  'lost_found_items',
  'room_amenities',
  'room_amenity_inventory',
  'guest_feedback',
  'night_audit_logs',
  'split_bills',
  'split_bill_portions',

  // POS & Orders
  'orders',
  'orders_unified',
  'kitchen_orders',
  'pos_transactions',
  'shared_bills',

  // Reservations & Tables
  'restaurant_tables',
  'reservations',
  'table_reservations',
  'waitlist',

  // Finance & Expenses
  'expenses',
  'expense_categories',
  'invoices',
  'invoice_line_items',
  'operational_costs',

  // Marketing
  'promotion_campaigns',
  'sent_promotions',
  'whatsapp_templates',
  'whatsapp_campaign_sends'
]

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let action: string | null = null
  let activeBackupId: string | null = null

  try {
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
      userId = user?.id ?? null
    }

    const body = await req.json()
    action = body.action
    const restaurant_id = body.restaurant_id
    activeBackupId = body.backup_id ?? null
    const name = body.name ?? null
    const backup_data = body.backup_data ?? null
    const requestedTables = body.tables ?? null // Array of tables to backup for partial backup
    
    console.log('Action:', action, 'Restaurant ID:', restaurant_id, 'Backup ID:', activeBackupId)

    if (!restaurant_id) {
      return new Response(
        JSON.stringify({ error: 'restaurant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Helper to fetch table data securely keeping parent-child integrity
    const fetchTableData = async (tableName: string, backupData: any) => {
      const getParentIds = async (parentTable: string, idField = 'id') => {
        const parentData = backupData[parentTable];
        if (Array.isArray(parentData)) {
          return parentData.map((row: any) => row[idField]).filter(Boolean);
        }
        // Fallback: fetch parent IDs from database
        const { data, error } = await supabaseClient
          .from(parentTable)
          .select(idField)
          .eq('restaurant_id', restaurant_id);
        if (error) {
          console.error(`Error fetching parent IDs for ${parentTable}:`, error);
          return [];
        }
        return data.map((row: any) => row[idField]).filter(Boolean);
      };

      if (tableName === 'recipe_ingredients' || tableName === 'recipe_nutrition') {
        const recipeIds = await getParentIds('recipes');
        if (recipeIds.length === 0) return [];
        const { data, error } = await supabaseClient.from(tableName).select('*').in('recipe_id', recipeIds);
        if (error) throw error;
        return data;
      }

      if (tableName === 'purchase_order_items') {
        const poIds = await getParentIds('purchase_orders');
        if (poIds.length === 0) return [];
        const { data, error } = await supabaseClient.from(tableName).select('*').in('purchase_order_id', poIds);
        if (error) throw error;
        return data;
      }

      if (tableName === 'menu_item_variants') {
        const itemIds = await getParentIds('menu_items');
        if (itemIds.length === 0) return [];
        const { data, error } = await supabaseClient.from(tableName).select('*').in('menu_item_id', itemIds);
        if (error) throw error;
        return data;
      }

      if (tableName === 'homemade_production_log_items') {
        const logIds = await getParentIds('homemade_production_logs');
        if (logIds.length === 0) return [];
        const { data, error } = await supabaseClient.from(tableName).select('*').in('log_id', logIds);
        if (error) throw error;
        return data;
      }

      if (tableName === 'split_bill_portions') {
        const billIds = await getParentIds('split_bills');
        if (billIds.length === 0) return [];
        const { data, error } = await supabaseClient.from(tableName).select('*').in('split_bill_id', billIds);
        if (error) throw error;
        return data;
      }

      if (tableName === 'role_components') {
        const roleIds = await getParentIds('roles');
        if (roleIds.length === 0) return [];
        const { data, error } = await supabaseClient.from(tableName).select('*').in('role_id', roleIds);
        if (error) throw error;
        return data;
      }

      if (tableName === 'invoice_line_items') {
        const invoiceIds = await getParentIds('invoices');
        if (invoiceIds.length === 0) return [];
        const { data, error } = await supabaseClient.from(tableName).select('*').in('invoice_id', invoiceIds);
        if (error) throw error;
        return data;
      }

      if (tableName === 'staff_shift_assignments') {
        const shiftIds = await getParentIds('shifts');
        if (shiftIds.length === 0) return [];
        const { data, error } = await supabaseClient.from(tableName).select('*').in('shift_id', shiftIds);
        if (error) throw error;
        return data;
      }

      const staffChildTables = [
        'staff_documents', 'staff_shifts', 'staff_time_clock', 
        'staff_leaves', 'staff_leave_requests', 'staff_notifications'
      ];
      if (staffChildTables.includes(tableName)) {
        const staffIds = await getParentIds('staff');
        if (staffIds.length === 0) return [];
        const { data, error } = await supabaseClient.from(tableName).select('*').in('staff_id', staffIds);
        if (error) throw error;
        return data;
      }

      // Default query for tables with restaurant_id
      const { data, error } = await supabaseClient.from(tableName).select('*').eq('restaurant_id', restaurant_id);
      if (error) throw error;
      return data;
    };

    if (action === 'backup') {
      console.log(`Creating backup for restaurant: ${restaurant_id}`)
      
      const tablesToProcess = Array.isArray(requestedTables) 
        ? ALL_TABLES_ORDERED.filter(t => requestedTables.includes(t))
        : ALL_TABLES_ORDERED;

      // Create backup record in DB if not exist
      if (!activeBackupId) {
        const { data: backup, error: backupError } = await supabaseClient
          .from('backups')
          .insert({
            restaurant_id,
            backup_type: Array.isArray(requestedTables) ? 'incremental' : 'full',
            name: name || `backup-${new Date().toISOString().split('T')[0]}`,
            status: 'in_progress',
            created_by: userId
          })
          .select()
          .single()

        if (backupError) throw backupError
        activeBackupId = backup.id
      } else {
        await supabaseClient
          .from('backups')
          .update({ status: 'in_progress' })
          .eq('id', activeBackupId)
      }

      // Export data
      const backupData: any = { restaurant_id, timestamp: new Date().toISOString() }

      for (const table of tablesToProcess) {
        try {
          const data = await fetchTableData(table, backupData);
          if (data) {
            backupData[table] = data;
          }
        } catch (error) {
          console.error(`Error backing up table ${table}:`, error);
        }
      }

      const jsonString = JSON.stringify(backupData)
      const filePath = `${restaurant_id}/${activeBackupId}.json`

      // Upload to backups storage bucket
      const { error: uploadError } = await supabaseClient
        .storage
        .from('backups')
        .upload(filePath, jsonString, {
          contentType: 'application/json',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Update backup status in DB
      const { error: updateError } = await supabaseClient
        .from('backups')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          file_path: filePath,
          file_size: jsonString.length 
        })
        .eq('id', activeBackupId)

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({ 
          success: true, 
          backup_id: activeBackupId,
          file_path: filePath,
          file_size: jsonString.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'restore') {
      console.log(`Restoring backup for restaurant: ${restaurant_id}`)
      
      let finalBackupData = backup_data
      
      if (!finalBackupData && activeBackupId) {
        const { data: backupRecord, error: fetchRecordError } = await supabaseClient
          .from('backups')
          .select('file_path')
          .eq('id', activeBackupId)
          .single()
          
        if (fetchRecordError) throw fetchRecordError
        if (!backupRecord || !backupRecord.file_path) {
          throw new Error(`Backup record not found or file_path is missing for ID ${activeBackupId}`)
        }
        
        const { data: fileData, error: downloadError } = await supabaseClient
          .storage
          .from('backups')
          .download(backupRecord.file_path)
          
        if (downloadError) throw downloadError
        if (!fileData) {
          throw new Error('Downloaded backup data is empty')
        }
        
        const text = await fileData.text()
        finalBackupData = JSON.parse(text)
      }

      if (!finalBackupData) {
        return new Response(
          JSON.stringify({ error: 'No backup data or backup ID provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete child tables first (Reverse dependency order)
      const tablesToDelete = ALL_TABLES_ORDERED.slice().reverse();
      for (const table of tablesToDelete) {
        if (finalBackupData[table]) {
          const { error: deleteError } = await supabaseClient
            .from(table)
            .delete()
            .eq('restaurant_id', restaurant_id)
            
          if (deleteError) {
            console.error(`Error deleting from ${table}:`, deleteError)
          }
        }
      }

      // Insert parent tables first (Forward dependency order)
      for (const table of ALL_TABLES_ORDERED) {
        const tableData = finalBackupData[table]
        if (Array.isArray(tableData) && tableData.length > 0) {
          const { error: insertError } = await supabaseClient
            .from(table)
            .insert(tableData)
            
          if (insertError) {
            console.error(`Error inserting into ${table}:`, insertError)
            throw new Error(`Failed to restore table ${table}: ${insertError.message}`)
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Backup restored successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Backup/Restore error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (action === 'backup' && activeBackupId) {
      try {
        await supabaseClient
          .from('backups')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorMessage
          })
          .eq('id', activeBackupId)
      } catch (dbErr) {
        console.error('Failed to update backup status to failed:', dbErr)
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})