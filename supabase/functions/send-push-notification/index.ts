import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Parse the Webhook payload from pg_net
    const payload = await req.json();
    const record = payload.record;

    console.log(`[Push] Triggered for table: ${payload.table}`);
    console.log(`[Push] Record ID: ${record.id}`);
    console.log(`[Push] Record Title: ${record.title}`);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const title = record.title || "New Notification";
    const body = record.message || "";
    const restaurantId = record.restaurant_id;

    if (!restaurantId) {
      console.warn("[Push] No restaurant_id in record, skipping push notification.");
      return new Response(JSON.stringify({ message: "No restaurant_id" }), { status: 200 });
    }

    // Get profiles for this restaurant to find relevant users
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("restaurant_id", restaurantId);

    if (profilesError) {
      console.error("[Push] Error fetching profiles:", profilesError);
    }

    console.log(`[Push] Profiles found for restaurant ${restaurantId}: ${profiles?.length ?? 0}`);

    let targetTokens: string[] = [];

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map((p: any) => p.id);

      const { data: tokens, error: tokensError } = await supabaseAdmin
        .from("user_push_tokens")
        .select("token")
        .in("user_id", userIds);

      if (tokensError) {
        console.error("[Push] Error fetching tokens from user_push_tokens:", tokensError);
      }

      if (tokens) {
        targetTokens = tokens.map((t: any) => t.token);
      }
    }

    console.log(`[Push] Unique FCM tokens found: ${targetTokens.length}`);

    if (targetTokens.length === 0) {
      console.log(`[Push] No push tokens registered for restaurant: ${restaurantId}`);
      return new Response(
        JSON.stringify({ message: "No devices registered for push." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get Firebase service account
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountStr) {
      console.error("[Push] FATAL: FIREBASE_SERVICE_ACCOUNT secret is missing in Supabase.");
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret.");
    }

    // Clean the secret string
    let cleanedStr = serviceAccountStr.trim();
    if ((cleanedStr.startsWith("'") && cleanedStr.endsWith("'")) ||
        (cleanedStr.startsWith('"') && cleanedStr.endsWith('"'))) {
      cleanedStr = cleanedStr.slice(1, -1);
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(cleanedStr);
      if (typeof serviceAccount === 'string') {
        serviceAccount = JSON.parse(serviceAccount);
      }
      
      console.log("[Push] Parsed JSON keys:", Object.keys(serviceAccount));
      console.log("[Push] Is project_id undefined?", typeof serviceAccount.project_id === "undefined");
    } catch (e) {
      console.error("[Push] FATAL: FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
      throw e;
    }

    const projectId = serviceAccount.project_id;
    console.log("Edge Function sending push using Firebase Project ID:", projectId);

    // Get OAuth2 access token using service account JWT
    const getAccessToken = async (): Promise<string> => {
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: "RS256", typ: "JWT" };
      const claim = {
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      };

      const encode = (obj: object) =>
        btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

      const unsigned = `${encode(header)}.${encode(claim)}`;

      const pemKey = serviceAccount.private_key;
      const keyData = pemKey
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\s/g, "");

      const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        new TextEncoder().encode(unsigned)
      );

      const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

      const jwt = `${unsigned}.${sigB64}`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        console.error("[Push] OAuth Token Error:", tokenData);
        throw new Error("Failed to get FCM access token");
      }
      return tokenData.access_token;
    };

    const accessToken = await getAccessToken();
    console.log("[Push] FCM Access Token acquired successfully");

    // Send FCM notification to each token
    const results = await Promise.allSettled(
      targetTokens.map(async (token: string) => {
        const fcmRes = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body },
                data: {
                  title: title || "",
                  body: body || "",
                  // Add click_action if needed for navigation
                },
                android: {
                  priority: "high",
                  notification: {
                    channel_id: "swadeshi_solutions_channel_silent"
                  }
                },
              },
            }),
          }
        );
        const result = await fcmRes.json();
        if (result.error) {
          console.error(`[Push] FCM Error for token ...${token.slice(-6)}:`, result.error);
        } else {
          console.log(`[Push] FCM Success for token ...${token.slice(-6)}:`, result.name);
        }
        return result;
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled" && !(r.value as any).error).length;
    const failCount = results.length - successCount;

    console.log(`[Push] Batch complete. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({ success: true, sentCount: successCount, failureCount: failCount }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Push] Critical Error in Edge Function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
