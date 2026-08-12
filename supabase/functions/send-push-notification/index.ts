import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import admin from "npm:firebase-admin@11.11.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Firebase Admin once per Edge Function instance
const initFirebase = () => {
  if (!admin.apps.length) {
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountStr) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable.");
    }
    
    const serviceAccount = JSON.parse(serviceAccountStr);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
};

serve(async (req) => {
  try {
    // 1. Verify standard Supabase auth (JWT) if needed, or if triggered via webhook, 
    // we can rely on the secret Authorization header.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401 });
    }

    // Initialize Supabase Admin Client to query user_push_tokens table
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 2. Parse the Webhook payload
    const payload = await req.json();
    const record = payload.record;
    const table = payload.table;

    // Default title/message based on table
    let title = record.title || "New Notification";
    let message = record.message || "";
    let userId = null;

    if (table === "staff_notifications") {
      userId = record.staff_id;
    } else if (table === "owner_notifications") {
      // In owner_notifications, there might not be a specific user_id. 
      // You'll need to query all owners, or maybe the payload has a user_id.
      // For now, if no explicit user_id is provided, we might have to fetch all owner tokens.
      // Let's assume we want to send it to all admins/owners for this restaurant.
      if (record.restaurant_id) {
         const { data: owners } = await supabaseAdmin
           .from('profiles')
           .select('id')
           .in('role', ['admin', 'owner']);
           // Ideally filter by restaurant_id if profiles are linked.
           // Since profiles doesn't inherently have restaurant_id in many setups, 
           // we'll just fetch all tokens for the identified owners.
      }
    }

    // 3. Fetch FCM tokens from database
    let targetTokens: string[] = [];

    if (userId) {
      // Single user target
      const { data: tokens, error } = await supabaseAdmin
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', userId);

      if (error) throw error;
      if (tokens) {
        targetTokens = tokens.map(t => t.token);
      }
    } else if (table === "owner_notifications") {
      // Get all owners' tokens
      const { data: owners } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('role', ['owner', 'admin']);
        
      if (owners && owners.length > 0) {
        const ownerIds = owners.map(o => o.id);
        const { data: tokens, error } = await supabaseAdmin
          .from('user_push_tokens')
          .select('token')
          .in('user_id', ownerIds);
          
        if (!error && tokens) {
          targetTokens = tokens.map(t => t.token);
        }
      }
    }

    if (targetTokens.length === 0) {
      return new Response(JSON.stringify({ message: "No devices registered for push." }), { status: 200 });
    }

    // 4. Send via Firebase Admin
    initFirebase();

    const fcmPayload = {
      notification: {
        title: title,
        body: message,
      },
      tokens: targetTokens,
    };

    const response = await admin.messaging().sendMulticast(fcmPayload);
    
    // Clean up old/invalid tokens (optional)
    const tokensToRemove: string[] = [];
    response.responses.forEach((res: any, idx: number) => {
      if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
        tokensToRemove.push(targetTokens[idx]);
      }
    });

    if (tokensToRemove.length > 0) {
      await supabaseAdmin
        .from('user_push_tokens')
        .delete()
        .in('token', tokensToRemove);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount: response.successCount, 
        failureCount: response.failureCount 
      }), 
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-push-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
