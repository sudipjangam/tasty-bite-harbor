import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Auto Clock-Out Edge Function
 * 
 * This function runs on a schedule (via pg_cron or external trigger) to:
 * 1. Close shifts that exceed their auto_clock_out_minutes threshold after shift end
 * 2. Close all shifts older than 16 hours (safety limit)
 * 3. Update staff status back to 'active'
 * 
 * Can also be triggered manually for cleanup.
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const now = new Date()
    const results = {
      checkedSessions: 0,
      autoClosedByShift: 0,
      autoClosedByMaxDuration: 0,
      errors: [] as string[],
    }

    // Maximum shift duration in hours (safety limit)
    const MAX_SHIFT_HOURS = 16

    // Get all active time clock entries without clock-out
    const { data: activeSessions, error: activeSessionsError } = await supabaseClient
      .from('staff_time_clock')
      .select('id, staff_id, clock_in, restaurant_id, shift_id')
      .is('clock_out', null)
      .order('clock_in', { ascending: true })

    if (activeSessionsError) {
      throw activeSessionsError
    }

    results.checkedSessions = activeSessions?.length || 0

    for (const session of activeSessions || []) {
      const clockInTime = new Date(session.clock_in)
      const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

      // Check 1: Max shift duration exceeded (safety limit)
      if (hoursWorked >= MAX_SHIFT_HOURS) {
        const autoClockOut = new Date(clockInTime.getTime() + (MAX_SHIFT_HOURS * 60 * 60 * 1000))
        
        const { error: updateError } = await supabaseClient
          .from('staff_time_clock')
          .update({
            clock_out: autoClockOut.toISOString(),
            notes: `System auto clock-out: Exceeded ${MAX_SHIFT_HOURS}h max shift duration`,
          })
          .eq('id', session.id)

        if (updateError) {
          results.errors.push(`Failed to close session ${session.id}: ${updateError.message}`)
        } else {
          // Update staff status
          await supabaseClient
            .from('staff')
            .update({ status: 'active' })
            .eq('id', session.staff_id)
          
          results.autoClosedByMaxDuration++
        }
        continue
      }

      // Check 2: Past shift end + auto_clock_out_minutes threshold
      if (session.shift_id) {
        // Get the shift's auto_clock_out_minutes setting
        const { data: shift } = await supabaseClient
          .from('shifts')
          .select('end_time, auto_clock_out_minutes')
          .eq('id', session.shift_id)
          .single()

        if (shift) {
          // Parse shift end time for the day of clock-in
          const clockInDate = clockInTime.toISOString().split('T')[0]
          const [hours, minutes] = shift.end_time.split(':').map(Number)
          const shiftEndTime = new Date(`${clockInDate}T${shift.end_time}`)
          
          // Handle overnight shifts (if shift end is before clock-in time, add a day)
          if (shiftEndTime < clockInTime) {
            shiftEndTime.setDate(shiftEndTime.getDate() + 1)
          }

          const autoClockOutMinutes = shift.auto_clock_out_minutes || 120
          const autoClockOutTime = new Date(shiftEndTime.getTime() + (autoClockOutMinutes * 60 * 1000))

          if (now >= autoClockOutTime) {
            const { error: updateError } = await supabaseClient
              .from('staff_time_clock')
              .update({
                clock_out: autoClockOutTime.toISOString(),
                notes: `System auto clock-out: ${autoClockOutMinutes} min after shift end`,
              })
              .eq('id', session.id)

            if (updateError) {
              results.errors.push(`Failed to close session ${session.id}: ${updateError.message}`)
            } else {
              // Update staff status
              await supabaseClient
                .from('staff')
                .update({ status: 'active' })
                .eq('id', session.staff_id)
              
              results.autoClosedByShift++
            }
          }
        }
      }
    }

    // Return the result
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.checkedSessions} active sessions`,
        results,
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
