
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get all active time clock entries without clock-out
    const { data: activeSessions, error: activeSessionsError } = await supabaseClient
      .from('staff_time_clock')
      .select('*')
      .is('clock_out', null)
      .order('clock_in', { ascending: false })

    if (activeSessionsError) {
      throw activeSessionsError
    }

    // Process the data (in a real function, you'd send notifications or auto-close sessions)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const missedClockouts = activeSessions.filter(session => 
      new Date(session.clock_in) < yesterday
    )

    // Return the result
    return new Response(
      JSON.stringify({
        active_sessions: activeSessions.length,
        missed_clockouts: missedClockouts.length,
        sessions: missedClockouts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
