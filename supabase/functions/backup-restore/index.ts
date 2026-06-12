import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TABLES_TO_BACKUP = [
  'restaurant_settings',
  'payment_methods',
  'shift_types',
  'customers',
  'staff',
  'menu_items',
  'inventory_items',
  'rooms',
  'expenses',
  'reservations',
  'orders',
  'loyalty_transactions'
]

// Delete child tables first to avoid foreign key violations
const DELETION_ORDER = [
  'loyalty_transactions',
  'orders',
  'reservations',
  'expenses',
  'rooms',
  'inventory_items',
  'menu_items',
  'staff',
  'customers',
  'shift_types',
  'payment_methods',
  'restaurant_settings'
]

// Insert parent tables first to avoid foreign key violations
const INSERTION_ORDER = [
  'restaurant_settings',
  'payment_methods',
  'shift_types',
  'customers',
  'staff',
  'menu_items',
  'inventory_items',
  'rooms',
  'expenses',
  'reservations',
  'orders',
  'loyalty_transactions'
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
    
    console.log('Action:', action, 'Restaurant ID:', restaurant_id, 'Backup ID:', activeBackupId)

    if (!restaurant_id) {
      return new Response(
        JSON.stringify({ error: 'restaurant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'backup') {
      console.log(`Creating backup for restaurant: ${restaurant_id}`)
      
      // If backup_id is not passed, create a backup record
      if (!activeBackupId) {
        const { data: backup, error: backupError } = await supabaseClient
          .from('backups')
          .insert({
            restaurant_id,
            backup_type: 'full',
            name: name || `full-backup-${new Date().toISOString().split('T')[0]}`,
            status: 'in_progress',
            created_by: userId
          })
          .select()
          .single()

        if (backupError) throw backupError
        activeBackupId = backup.id
      } else {
        // Update existing record to in_progress
        await supabaseClient
          .from('backups')
          .update({ status: 'in_progress' })
          .eq('id', activeBackupId)
      }

      // Export restaurant data
      const backupData: any = { restaurant_id, timestamp: new Date().toISOString() }

      for (const table of TABLES_TO_BACKUP) {
        const { data, error } = await supabaseClient
          .from(table)
          .select('*')
          .eq('restaurant_id', restaurant_id)

        if (!error && data) {
          backupData[table] = data
        } else if (error) {
          console.error(`Error selecting from ${table}:`, error)
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
        // Fetch backup record to get file_path
        const { data: backupRecord, error: fetchRecordError } = await supabaseClient
          .from('backups')
          .select('file_path')
          .eq('id', activeBackupId)
          .single()
          
        if (fetchRecordError) throw fetchRecordError
        if (!backupRecord || !backupRecord.file_path) {
          throw new Error(`Backup record not found or file_path is missing for ID ${activeBackupId}`)
        }
        
        // Download from storage
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

      // Delete child tables first
      for (const table of DELETION_ORDER) {
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

      // Insert parent tables first
      for (const table of INSERTION_ORDER) {
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