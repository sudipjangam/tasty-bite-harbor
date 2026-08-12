import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Parse the Webhook payload from pg_net
    const payload = await req.json();
    const record = payload.record;

    console.log("Received payload for table:", payload.table);
    console.log("Record:", JSON.stringify(record));

    // Initialize Supabase Admin Client (uses built-in env vars in Edge Functions)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const title = record.title || "New Notification";
    const body = record.message || "";
    const restaurantId = record.restaurant_id;

    if (!restaurantId) {
      console.log("No restaurant_id in record, skipping push");
      return new Response(JSON.stringify({ message: "No restaurant_id" }), { status: 200 });
    }

    // Get ALL tokens for ALL users in this restaurant
    // Simpler approach: get all user_push_tokens linked to profiles for this restaurant
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("restaurant_id", restaurantId);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    console.log("Profiles found:", profiles?.length ?? 0);

    let targetTokens: string[] = [];

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map((p: any) => p.id);

      const { data: tokens, error: tokensError } = await supabaseAdmin
        .from("user_push_tokens")
        .select("token")
        .in("user_id", userIds);

      if (tokensError) {
        console.error("Error fetching tokens:", tokensError);
      }

      console.log("Tokens found:", tokens?.length ?? 0);

      if (tokens) {
        targetTokens = tokens.map((t: any) => t.token);
      }
    }

    if (targetTokens.length === 0) {
      console.log("No push tokens found for restaurant:", restaurantId);
      return new Response(
        JSON.stringify({ message: "No devices registered for push." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Sending FCM to", targetTokens.length, "device(s)");

    // Get Firebase service account
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountStr) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret.");
    }

    // Strip surrounding single or double quotes if present (common secret storage issue)
    let cleanedStr = serviceAccountStr.trim();
    if ((cleanedStr.startsWith("'") && cleanedStr.endsWith("'")) ||
        (cleanedStr.startsWith('"') && cleanedStr.endsWith('"'))) {
      cleanedStr = cleanedStr.slice(1, -1);
    }

    const serviceAccount = JSON.parse(cleanedStr);
    const projectId = serviceAccount.project_id;

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

      // Import RSA private key
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
        throw new Error("Failed to get FCM access token: " + JSON.stringify(tokenData));
      }
      return tokenData.access_token;
    };

    const accessToken = await getAccessToken();

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
                  body: body || ""
                },
                android: {
                  priority: "high",
                  notification: {
                    channel_id: "tasty_bite_channel"
                  }
                },
              },
            }),
          }
        );
        const result = await fcmRes.json();
        console.log("FCM result for token:", token.slice(-10), JSON.stringify(result));
        return result;
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ success: true, sentCount: successCount, failureCount: failCount }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-push-notification:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
