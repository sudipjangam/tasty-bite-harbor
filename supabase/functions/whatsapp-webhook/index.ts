import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
};

// ── SECURITY: Meta Webhook Signature Verification ──────────────────────────
// Validates the X-Hub-Signature-256 header sent by Meta on every webhook POST.
// This prevents spoofed delivery receipts and message events.
async function verifyMetaSignature(
  req: Request,
  rawBody: string
): Promise<boolean> {
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret) {
    console.warn("⚠️ WHATSAPP_APP_SECRET not set — skipping signature verification (INSECURE)");
    // In production this MUST return false. Allowing for initial setup only.
    return true;
  }

  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) {
    console.error("❌ Missing x-hub-signature-256 header");
    return false;
  }

  // Signature format: "sha256=<hex>"
  const expectedPrefix = "sha256=";
  if (!signature.startsWith(expectedPrefix)) {
    console.error("❌ Invalid signature format");
    return false;
  }

  const receivedHash = signature.slice(expectedPrefix.length);

  // Compute HMAC SHA-256 of the raw body using the app secret
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );
  const computedHash = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const isValid = computedHash === receivedHash;
  if (!isValid) {
    console.error("❌ Signature mismatch:", { received: receivedHash, computed: computedHash });
  }
  return isValid;
}

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
      // Read raw body for signature verification
      const rawBody = await req.text();

      // ── SECURITY: Verify Meta signature ───────────────────────────────
      const isSignatureValid = await verifyMetaSignature(req, rawBody);
      if (!isSignatureValid) {
        console.error("❌ Webhook signature verification FAILED — rejecting request");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = JSON.parse(rawBody);
      
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
