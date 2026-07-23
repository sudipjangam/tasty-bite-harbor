import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const { type: opType, record, old_record } = payload;

    console.log(`Approvals Notifier Webhook triggered: Operation ${opType}`);

    if (opType === 'INSERT') {
      // 1. Notify Owner / Regional Managers
      // Fetch organization and managers
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('name, owner_user_id')
        .eq('id', record.organization_id)
        .single();

      if (orgError || !org) throw orgError || new Error("Organization not found");

      // Fetch owner profile
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('phone, name')
        .eq('id', org.owner_user_id)
        .single();

      // Fetch regional managers (admins in organization_members with non-null accessible_branches)
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', record.organization_id)
        .eq('role', 'admin');

      const managerIds = (members || []).map((m: any) => m.user_id);
      
      // Get profiles of managers
      const { data: managerProfiles } = await supabase
        .from('profiles')
        .select('phone, name')
        .in('id', managerIds);

      const recipients = [];
      if (ownerProfile?.phone) recipients.push({ phone: ownerProfile.phone, name: ownerProfile.name });
      (managerProfiles || []).forEach((p: any) => {
        if (p.phone) recipients.push({ phone: p.phone, name: p.name });
      });

      console.log(`Sending new request notifications to ${recipients.length} recipients...`);

      // Trigger notification sends (call send-whatsapp-unified)
      for (const rec of recipients) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-unified`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phone: rec.phone,
              templateName: 'franchise_approval_alert',
              variables: [
                rec.name, // 1. Recipient Name
                org.name, // 2. Organization Name
                record.type === 'discount' ? 'Discount Request' : 'Price Limit Override', // 3. Type
                record.bm_comment || 'No comment provided.', // 4. BM Comment
              ]
            })
          });
        } catch (err) {
          console.warn(`Failed to notify ${rec.name} (${rec.phone}):`, err);
        }
      }
    } else if (opType === 'UPDATE' && old_record && record.status !== old_record.status) {
      // 2. Notify BM (Requester) of decision
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('phone, name')
        .eq('id', record.requester_id)
        .single();

      if (requesterProfile?.phone) {
        console.log(`Notifying requester BM ${requesterProfile.name} of status change to ${record.status}`);
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-unified`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phone: requesterProfile.phone,
              templateName: 'franchise_approval_decision',
              variables: [
                requesterProfile.name, // 1. Requester Name
                record.type === 'discount' ? 'Discount Request' : 'Price Limit Override', // 2. Request Type
                record.status.toUpperCase(), // 3. Status (APPROVED/REJECTED)
                record.resolver_comment || 'No decision comment provided.', // 4. Reviewer Comment
              ]
            })
          });
        } catch (err) {
          console.error('Failed to send notification to BM:', err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Webhook processing failed:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
