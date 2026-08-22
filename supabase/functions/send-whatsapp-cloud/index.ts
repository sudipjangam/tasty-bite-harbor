import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  checkRateLimit, 
  createRateLimitResponse, 
  getRequestIdentifier 
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit config for WhatsApp messages
const WHATSAPP_RATE_LIMIT = {
  maxRequests: 100,        // 100 messages
  windowMs: 60 * 60 * 1000, // per hour
  keyPrefix: 'whatsapp-cloud',
};

interface WhatsAppCloudRequest {
  // For sending messages
  phone: string;
  message?: string;
  
  // For bill messages
  orderId?: string;
  customerName?: string;
  restaurantName?: string;
  restaurantId?: string;
  total?: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
  tableNumber?: string;
  orderDate?: string;
  
  // Message type
  messageType?: 'text' | 'template' | 'bill';
  templateName?: string;
  templateLanguage?: string;
}

// Send message via WhatsApp Cloud API
async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  message: string,
  messageType: 'text' | 'template' = 'text',
  templateName?: string,
  templateLanguage: string = 'en_US'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  // Format phone number - remove spaces, ensure no + prefix for API
  let formattedPhone = to.replace(/[\s\-\(\)]/g, '');
  if (formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.substring(1);
  }
  // Add India country code if no country code
  if (formattedPhone.length === 10) {
    formattedPhone = '91' + formattedPhone;
  }
  
  console.log('📱 Sending WhatsApp message:', {
    to: formattedPhone,
    type: messageType,
    messageLength: message?.length || 0,
  });
  
  const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
  
  let requestBody: any;
  
  if (messageType === 'template') {
    // Template message (for first contact)
    requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName || 'hello_world',
        language: { code: templateLanguage },
      },
    };
  } else {
    // Text message (within 24hr window)
    requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: { body: message },
    };
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const result = await response.json();
    
    console.log('WhatsApp API Response:', {
      status: response.status,
      ok: response.ok,
      result: result,
    });
    
    if (!response.ok) {
      const errorMessage = result.error?.message || `API error: ${response.status}`;
      console.error('❌ WhatsApp API error:', result);
      return { success: false, error: errorMessage };
    }
    
    const messageId = result.messages?.[0]?.id;
    console.log('✅ Message sent successfully! ID:', messageId);
    
    return { success: true, messageId };
    
  } catch (error) {
    console.error('❌ Network error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

// Generate bill message
function generateBillMessage(data: WhatsAppCloudRequest): string {
  const {
    customerName = 'Valued Customer',
    restaurantName = 'Restaurant',
    total = 0,
    items = [],
    tableNumber,
    orderDate,
  } = data;
  
  const formattedTotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(total);
  
  let itemsList = '';
  if (items.length > 0) {
    itemsList = items.map(item => 
      `▪️ ${item.name} x${item.quantity} - ₹${(item.price * item.quantity).toFixed(0)}`
    ).join('\n');
  }
  
  const message = `🍽️ *${restaurantName}*

Dear ${customerName},

Thank you for dining with us! Here's your bill:

${tableNumber ? `📍 *Table:* ${tableNumber}\n` : ''}${orderDate ? `📅 *Date:* ${orderDate}\n` : ''}
${itemsList ? `\n📋 *Order Details:*\n${itemsList}\n` : ''}
💰 *Total Amount:* ${formattedTotal}

We hope you enjoyed your meal! Please visit again soon! 🙏

Best regards,
*${restaurantName}* Team`;

  return message;
}

serve(async (req: Request) => {
  console.log(`${req.method} request received at ${new Date().toISOString()}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Rate limiting check
  const authHeader = req.headers.get('authorization');
  const identifier = getRequestIdentifier(req, authHeader);
  const rateLimitResult = checkRateLimit(identifier, WHATSAPP_RATE_LIMIT);
  
  if (!rateLimitResult.allowed) {
    console.log(`WhatsApp rate limit exceeded for ${identifier}`);
    return createRateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const requestBody = await req.json() as WhatsAppCloudRequest;
    const { phone, message, messageType = 'text', templateName, orderId } = requestBody;
    
    // Get WhatsApp Cloud API credentials
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    
    if (!phoneNumberId || !accessToken) {
      console.error('Missing WhatsApp Cloud API credentials');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WhatsApp Cloud API not configured. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      );
    }
    
    // Validate phone number
    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }
    
    // Generate message based on type
    let finalMessage = message;
    let useTemplate = false;
    let templateToUse = templateName || 'hello_world';
    
    // For bills, we use template message to bypass 24-hour window
    // The hello_world template is pre-approved by Meta
    if (messageType === 'bill') {
      finalMessage = generateBillMessage(requestBody);
      useTemplate = true; // Always use template for bills to ensure delivery
      templateToUse = templateName || 'hello_world'; // Use custom template if provided, else hello_world
      console.log('📋 Bill message - using template:', templateToUse);
    } else if (messageType === 'template') {
      useTemplate = true;
    } else if (!message) {
      finalMessage = generateBillMessage(requestBody);
    }
    
    console.log('Processing WhatsApp message:', {
      phone: phone ? `${phone.substring(0, 3)}***` : 'Missing',
      messageType,
      useTemplate,
      templateName: templateToUse,
      messageLength: finalMessage?.length || 0,
    });
    
    // Send the message - use template for bills to bypass 24hr window
    const result = await sendWhatsAppMessage(
      phoneNumberId,
      accessToken,
      phone,
      finalMessage || '',
      useTemplate ? 'template' : 'text',
      templateToUse
    );

    
    // Log to whatsapp_campaign_sends master table
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && supabaseServiceKey && restaurantId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('whatsapp_campaign_sends').insert({
          restaurant_id: restaurantId,
          restaurant_name: restaurantName || null,
          customer_phone: phone,
          customer_name: customerName || 'Customer',
          template_name: templateToUse || 'text_message',
          provider: 'meta_cloud',
          message_type: orderId ? 'bill' : 'transactional',
          message_id: result.messageId || null,
          status: result.success ? 'sent' : 'failed',
          failure_reason: result.error || null,
          sent_at: result.success ? new Date().toISOString() : null,
          metadata: { orderId, total, tableNumber, items: items || [] },
        });

        // Update kitchen_orders if orderId provided
        if (orderId && result.success) {
          await supabase
            .from('kitchen_orders')
            .update({ 
              whatsapp_sent: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);
        }
      }
    } catch (logErr) {
      console.error('Master log error in send-whatsapp-cloud:', logErr);
    }
    
    // Return response
    return new Response(
      JSON.stringify({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        phone: phone,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
