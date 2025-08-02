import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  channelId?: string
  restaurantId: string
  syncType: 'rates' | 'availability' | 'all'
  bulkSync?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { channelId, restaurantId, syncType, bulkSync }: SyncRequest = await req.json()

    console.log('Starting channel sync:', { channelId, restaurantId, syncType, bulkSync })

    // Get channels to sync
    let channelsQuery = supabase
      .from('booking_channels')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)

    if (channelId && !bulkSync) {
      channelsQuery = channelsQuery.eq('id', channelId)
    }

    const { data: channels, error: channelsError } = await channelsQuery

    if (channelsError) throw channelsError

    // Get room and rate data for syncing
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('restaurant_id', restaurantId)

    if (roomsError) throw roomsError

    const { data: ratePlans, error: ratePlansError } = await supabase
      .from('rate_plans')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)

    if (ratePlansError) throw ratePlansError

    const syncResults = []

    // Process each channel
    for (const channel of channels) {
      console.log(`Syncing channel: ${channel.channel_name}`)
      
      const syncResult = {
        channelId: channel.id,
        channelName: channel.channel_name,
        status: 'success',
        syncedRecords: 0,
        errors: [] as string[]
      }

      try {
        // Simulate different sync operations based on channel type
        switch (channel.channel_type) {
          case 'ota':
            await syncOTAChannel(channel, rooms, ratePlans, syncType)
            syncResult.syncedRecords = rooms.length * ratePlans.length
            break
          case 'direct':
            await syncDirectChannel(channel, rooms, ratePlans, syncType)
            syncResult.syncedRecords = rooms.length
            break
          case 'gds':
            await syncGDSChannel(channel, rooms, ratePlans, syncType)
            syncResult.syncedRecords = Math.floor(rooms.length * 1.5)
            break
          default:
            throw new Error(`Unknown channel type: ${channel.channel_type}`)
        }

        // Update channel with successful sync
        await supabase
          .from('booking_channels')
          .update({
            last_sync: new Date().toISOString(),
            channel_settings: {
              ...channel.channel_settings,
              lastSyncStatus: 'success',
              syncedRecords: syncResult.syncedRecords,
              lastSyncType: syncType
            }
          })
          .eq('id', channel.id)

      } catch (error) {
        console.error(`Sync failed for channel ${channel.channel_name}:`, error)
        syncResult.status = 'error'
        syncResult.errors.push(error.message)

        // Update channel with error status
        await supabase
          .from('booking_channels')
          .update({
            channel_settings: {
              ...channel.channel_settings,
              lastSyncStatus: 'error',
              lastSyncError: error.message,
              lastSyncType: syncType
            }
          })
          .eq('id', channel.id)
      }

      syncResults.push(syncResult)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronized ${channels.length} channels`,
        results: syncResults,
        syncType,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Channel sync error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// Simulate OTA channel sync (Booking.com, Expedia, etc.)
async function syncOTAChannel(channel: any, rooms: any[], ratePlans: any[], syncType: string) {
  console.log(`Syncing OTA channel: ${channel.channel_name}`)
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

  if (syncType === 'rates' || syncType === 'all') {
    // Sync rate plans and pricing
    for (const ratePlan of ratePlans) {
      // Simulate rate sync to OTA
      console.log(`Syncing rate plan ${ratePlan.name} to ${channel.channel_name}`)
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  if (syncType === 'availability' || syncType === 'all') {
    // Sync room availability
    for (const room of rooms) {
      // Simulate availability sync
      console.log(`Syncing room ${room.room_number} availability to ${channel.channel_name}`)
      await new Promise(resolve => setTimeout(resolve, 150))
    }
  }
}

// Simulate direct booking channel sync
async function syncDirectChannel(channel: any, rooms: any[], ratePlans: any[], syncType: string) {
  console.log(`Syncing direct channel: ${channel.channel_name}`)
  
  // Simulate faster sync for direct channels
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

  // Direct channels typically have simpler sync requirements
  console.log(`Updated ${rooms.length} rooms on direct channel`)
}

// Simulate GDS channel sync (Amadeus, Sabre, etc.)
async function syncGDSChannel(channel: any, rooms: any[], ratePlans: any[], syncType: string) {
  console.log(`Syncing GDS channel: ${channel.channel_name}`)
  
  // Simulate longer sync time for GDS systems
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

  if (syncType === 'rates' || syncType === 'all') {
    // GDS systems often require specific rate formatting
    console.log(`Formatting and syncing rates for GDS: ${channel.channel_name}`)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}