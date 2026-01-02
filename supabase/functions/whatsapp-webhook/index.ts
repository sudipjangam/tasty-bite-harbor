import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WhatsApp Cloud API Webhook Handler
// This handles both webhook verification (GET) and incoming messages (POST)

serve(async (req: Request) => {
  const url = new URL(req.url);
  
  console.log(`${req.method} request received at ${new Date().toISOString()}`);
  console.log(`Path: ${url.pathname}, Search: ${url.search}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // GET request - Webhook verification from Meta
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('Webhook verification request:', { mode, token, challenge });

    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ WEBHOOK VERIFIED');
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    } else {
      console.log('❌ Webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    }
  }

  // POST request - Incoming webhook events
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
      console.log(`\n📱 WhatsApp Webhook received ${timestamp}\n`);
      console.log(JSON.stringify(body, null, 2));

      // Process the webhook event
      if (body.object === 'whatsapp_business_account') {
        const entries = body.entry || [];
        
        for (const entry of entries) {
          const changes = entry.changes || [];
          
          for (const change of changes) {
            if (change.field === 'messages') {
              const value = change.value;
              const messages = value.messages || [];
              const statuses = value.statuses || [];
              
              // Handle incoming messages
              for (const message of messages) {
                console.log('📩 Incoming message:', {
                  from: message.from,
                  type: message.type,
                  timestamp: message.timestamp,
                  id: message.id,
                });
                
                // Log message content based on type
                if (message.type === 'text') {
                  console.log('   Text:', message.text?.body);
                } else if (message.type === 'image') {
                  console.log('   Image ID:', message.image?.id);
                } else if (message.type === 'button') {
                  console.log('   Button payload:', message.button?.payload);
                }
                
                // You can store incoming messages in database here
                // await storeMessage(message);
              }
              
              // Handle message status updates (sent, delivered, read)
              for (const status of statuses) {
                console.log('📊 Status update:', {
                  id: status.id,
                  status: status.status,
                  timestamp: status.timestamp,
                  recipient_id: status.recipient_id,
                });
              }
            }
          }
        }
      }

      // Always return 200 OK to acknowledge receipt
      return new Response(JSON.stringify({ status: 'received' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      
      // Still return 200 to prevent Meta from retrying
      return new Response(JSON.stringify({ status: 'error', message: 'Processing error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
