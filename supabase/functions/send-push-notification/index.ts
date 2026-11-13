import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight — OPTIONS has no body, must return 200 immediately
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  try {
    // Guard against empty body (GET/HEAD probes, misconfigured callers)
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Empty request body" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const record = payload.record ?? payload;

    console.log(`[Push] Triggered for table: ${payload.table}`);
    console.log(`[Push] Record ID: ${record.id}`);
    console.log(`[Push] Record Title: ${record.title}`);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? ""
    );

    const title = record.title || "New Notification";
    const body = record.message || "";
    const restaurantId = record.restaurant_id;
    const userId = record.user_id || payload.user_id;

    if (!restaurantId && !userId) {
      console.warn("[Push] No restaurant_id or user_id provided, skipping push notification.");
      return new Response(JSON.stringify({ error: "Missing restaurant_id or user_id" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let targetTokens: string[] = [];

    if (userId) {
      // Direct targeting for administrator user tokens
      const { data: tokens, error: tokensError } = await supabaseAdmin
        .from("user_push_tokens")
        .select("token")
        .eq("user_id", userId);

      if (tokensError) {
        console.error("[Push] Error fetching tokens for user_id:", tokensError);
      }
      if (tokens) {
        targetTokens = tokens.map((t: any) => t.token);
      }
      console.log(`[Push] User ${userId} push tokens found: ${targetTokens.length}`);
    } else if (restaurantId) {
      // Get profiles for this restaurant to find relevant users
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("restaurant_id", restaurantId);

      if (profilesError) {
        console.error("[Push] Error fetching profiles:", profilesError);
      }

      console.log(`[Push] Profiles found for restaurant ${restaurantId}: ${profiles?.length ?? 0}`);

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
    }

    console.log(`[Push] Unique FCM tokens found: ${targetTokens.length}`);

    if (targetTokens.length === 0) {
      const targetMsg = userId ? `user: ${userId}` : `restaurant: ${restaurantId}`;
      console.log(`[Push] No push tokens registered for ${targetMsg}`);
      return new Response(
        JSON.stringify({ success: false, message: `No devices registered for ${targetMsg}.` }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
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
    console.log("[Push] Project ID:", projectId);
    console.log("[Push] Client Email:", serviceAccount.client_email);
    console.log("[Push] Private Key ID:", serviceAccount.private_key_id);

    // Diagnostic check: verify against Google's public certificates
    try {
      const certsUrl = `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(serviceAccount.client_email)}`;
      const certsRes = await fetch(certsUrl);
      if (certsRes.ok) {
        const certs = await certsRes.json();
        const activeKeyIds = Object.keys(certs);
        console.log("[Push] Active Google Key IDs for this email:", activeKeyIds);
        const matchesActive = activeKeyIds.includes(serviceAccount.private_key_id);
        console.log("[Push] Does our private_key_id match an active Google key?", matchesActive);
        if (!matchesActive) {
          console.error(
            `[Push] KEY ROTATED/REVOKED: Key ID '${serviceAccount.private_key_id}' was not found in Google Cloud for ${serviceAccount.client_email}. Active key IDs: [${activeKeyIds.join(", ")}]. You must generate or copy the current private key JSON from Firebase Console > Project Settings > Service Accounts and update the FIREBASE_SERVICE_ACCOUNT secret in Supabase.`
          );
        }
      } else {
        console.warn(`[Push] Google certs endpoint returned HTTP ${certsRes.status} for ${serviceAccount.client_email}`);
      }
    } catch (e: any) {
      console.warn("[Push] Could not check Google public certs:", e.message);
    }

    // Function to create JWT and get Google OAuth2 access token
    const getAccessTokenForAccount = async (account: any): Promise<string> => {
      const now = Math.floor(Date.now() / 1000);
      const header: any = { alg: "RS256", typ: "JWT" };
      if (account.private_key_id) {
        header.kid = account.private_key_id;
      }

      const claim = {
        iss: account.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      };

      const toBase64Url = (input: string | Uint8Array): string => {
        let bytes: Uint8Array;
        if (typeof input === "string") {
          bytes = new TextEncoder().encode(input);
        } else {
          bytes = input;
        }
        let binary = "";
        const chunkSize = 1024;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary).replace(/[+/]/g, (c) => (c === "+" ? "-" : "_")).replace(/=/g, "");
      };

      const unsigned = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(claim))}`;

      // Clean PEM: handle literal \n and real whitespace
      const rawPem: string = account.private_key || "";
      const cleanedPem = rawPem
        .replace(/\\n/g, "\n")
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\s/g, "");

      const binaryKey = Uint8Array.from(atob(cleanedPem), (c) => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const sigBytes = new Uint8Array(
        await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned))
      );
      const sigB64 = toBase64Url(sigBytes);
      const jwt = `${unsigned}.${sigB64}`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        console.error("[Push] OAuth Token Error:", tokenData);
        throw new Error(
          `Google OAuth Error: ${tokenData.error || "unknown"} - ${tokenData.error_description || JSON.stringify(tokenData)}`
        );
      }
      return tokenData.access_token;
    };

    let accessToken: string;
    let usedAccountEmail = serviceAccount.client_email;
    let authSource = "FIREBASE_SERVICE_ACCOUNT";
    let primaryOAuthError: string | null = null;

    try {
      accessToken = await getAccessTokenForAccount(serviceAccount);
      console.log("[Push] FCM Access Token acquired successfully using FIREBASE_SERVICE_ACCOUNT:", serviceAccount.client_email);
    } catch (primaryErr: any) {
      primaryOAuthError = primaryErr.message;
      console.warn("[Push] Primary service account failed:", primaryErr.message);

      // Check if GOOGLE_SERVICE_ACCOUNT_KEY is configured for the same project
      const googleServiceAccountStr = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
      if (googleServiceAccountStr) {
        try {
          let gAccount = JSON.parse(googleServiceAccountStr.trim());
          if (typeof gAccount === "string") gAccount = JSON.parse(gAccount);
          if (gAccount.project_id === projectId) {
            console.log("[Push] Attempting fallback with GOOGLE_SERVICE_ACCOUNT_KEY...");
            accessToken = await getAccessTokenForAccount(gAccount);
            usedAccountEmail = gAccount.client_email;
            authSource = "GOOGLE_SERVICE_ACCOUNT_KEY";
            console.log("[Push] Fallback succeeded! FCM Access Token acquired via GOOGLE_SERVICE_ACCOUNT_KEY:", gAccount.client_email);
          } else {
            console.warn(`[Push] GOOGLE_SERVICE_ACCOUNT_KEY is for '${gAccount.project_id}', not '${projectId}'.`);
            throw primaryErr;
          }
        } catch (fallbackErr: any) {
          console.error("[Push] Fallback service account failed:", fallbackErr.message);
          throw primaryErr;
        }
      } else {
        throw primaryErr;
      }
    }
    console.log("[Push] FCM Access Token acquired successfully");

    // Send FCM notification to each token
    const deadTokens: string[] = [];
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
                  action_url: record.action_url || "",
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
          console.error(`[Push] FCM Error for token ...${token.slice(-6)}:`, JSON.stringify(result.error));
          const status = result.error.status;
          const code = Number(result.error.code);
          if (code === 404 || code === 400 || status === "NOT_FOUND" || status === "UNREGISTERED" || status === "INVALID_ARGUMENT") {
            deadTokens.push(token);
          }
        } else {
          console.log(`[Push] FCM Success for token ...${token.slice(-6)}:`, result.name);
        }
        return result;
      })
    );

    // Prune dead tokens so database stays clean
    if (deadTokens.length > 0) {
      console.log(`[Push] Auto-cleaning ${deadTokens.length} invalid/expired tokens from user_push_tokens...`);
      await supabaseAdmin.from("user_push_tokens").delete().in("token", deadTokens);
    }

    const successCount = results.filter((r) => r.status === "fulfilled" && !(r.value as any).error).length;
    const failCount = results.length - successCount;
    const firstError = results.find((r) => r.status === "fulfilled" && (r.value as any).error)?.value?.error;

    console.log(`[Push] Batch complete. Success: ${successCount}, Failed: ${failCount}`);

    let userFacingMessage = "";
    if (successCount > 0) {
      userFacingMessage = `Delivered to ${successCount} active device(s)`;
    } else if (firstError?.status === "PERMISSION_DENIED" || firstError?.code === 403) {
      userFacingMessage = `FCM Permission Denied: Service account '${usedAccountEmail}' needs 'Firebase Cloud Messaging API Admin' or 'cloudmessaging.messages.create' role on project '${projectId}' in Google Cloud Console.`;
    } else {
      userFacingMessage = `All ${failCount} registered device tokens were expired or unregistered in Firebase.`;
    }

    return new Response(
      JSON.stringify({ 
        success: successCount > 0, 
        sentCount: successCount, 
        failureCount: failCount,
        prunedTokens: deadTokens.length,
        authSource,
        usedAccountEmail,
        primaryOAuthError,
        firstError: firstError ? { code: firstError.code, message: firstError.message, status: firstError.status } : null,
        message: userFacingMessage,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Push] Critical Error in Edge Function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
