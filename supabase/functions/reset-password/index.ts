import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 });

  try {
    const { token, email, password } = await req.json();

    // Validate inputs
    if (!token || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Token, email, and password are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Look up the token in the database
    const { data: tokenRecord, error: lookupError } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("email", email.toLowerCase())
      .eq("used", false)
      .single();

    if (lookupError || !tokenRecord) {
      console.error("Token lookup failed:", lookupError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired reset link. Please request a new one." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if token has expired
    const expiresAt = new Date(tokenRecord.expires_at);
    if (expiresAt < new Date()) {
      // Mark as used so it can't be retried
      await supabaseAdmin.from("password_reset_tokens").update({ used: true }).eq("id", tokenRecord.id);
      return new Response(
        JSON.stringify({ error: "This reset link has expired. Please request a new one." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Find the user in Supabase Auth
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw new Error("Failed to find user");

    const user = users.users.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Update the password in Supabase Auth using Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password,
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      throw new Error("Failed to update password");
    }

    // Mark token as used
    await supabaseAdmin.from("password_reset_tokens").update({ used: true }).eq("id", tokenRecord.id);

    // Clean up old expired tokens
    await supabaseAdmin.from("password_reset_tokens").delete().lt("expires_at", new Date().toISOString());

    console.log(`Password successfully reset for ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Password updated successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in reset-password:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
