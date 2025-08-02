import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, restaurant_id } = await req.json()
    
    console.log('Action:', action, 'Restaurant ID:', restaurant_id)

    if (action === 'backup') {
      console.log(`Creating backup for restaurant: ${restaurant_id}`)
      
      // Create backup record
      const { data: backup, error: backupError } = await supabaseClient
        .from('backups')
        .insert({
          restaurant_id,
          backup_type: 'full',
          status: 'in_progress',
          created_by: (await supabaseClient.auth.getUser()).data.user?.id
        })
        .select()
        .single()

      if (backupError) throw backupError

      // Export all restaurant data
      const tables = [
        'menu_items', 'orders', 'staff', 'customers', 'expenses', 
        'inventory_items', 'rooms', 'reservations', 'loyalty_transactions',
        'restaurant_settings', 'payment_methods', 'shift_types'
      ]

      const backupData: any = { restaurant_id, timestamp: new Date().toISOString() }

      for (const table of tables) {
        const { data, error } = await supabaseClient
          .from(table)
          .select('*')
          .eq('restaurant_id', restaurant_id)

        if (!error && data) {
          backupData[table] = data
        }
      }

      // Update backup status
      await supabaseClient
        .from('backups')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          file_size: JSON.stringify(backupData).length 
        })
        .eq('id', backup.id)

      return new Response(
        JSON.stringify({ 
          success: true, 
          backup_id: backup.id,
          data: backupData 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'restore') {
      const { backup_data } = await req.json()
      
      console.log(`Restoring backup for restaurant: ${restaurant_id}`)

      // Restore data for each table
      for (const [tableName, tableData] of Object.entries(backup_data)) {
        if (tableName === 'restaurant_id' || tableName === 'timestamp') continue
        
        if (Array.isArray(tableData) && tableData.length > 0) {
          // Clear existing data
          await supabaseClient
            .from(tableName)
            .delete()
            .eq('restaurant_id', restaurant_id)

          // Insert backup data
          const { error } = await supabaseClient
            .from(tableName)
            .insert(tableData)

          if (error) {
            console.error(`Error restoring ${tableName}:`, error)
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})