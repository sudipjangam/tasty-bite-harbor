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

// Rate limit config for email sending
const EMAIL_RATE_LIMIT = {
  maxRequests: 50,        // 50 emails
  windowMs: 60 * 60 * 1000, // per hour
  keyPrefix: 'email',
};

interface EmailBillRequest {
  orderId: string;
  email: string;
  customerName: string;
  restaurantName: string;
  restaurantId?: string; // For DB lookup if name not provided
  restaurantAddress?: string;
  restaurantPhone?: string;
  restaurantEmail?: string;
  restaurantWebsite?: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  tableNumber?: string;
  orderDate?: string;
  discount?: number;
  promotionName?: string;
}

async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlContent: string,
  restaurantName: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    console.error("Missing RESEND_API_KEY environment variable");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${restaurantName} <onboarding@resend.dev>`, // Dynamic restaurant name
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      return { success: false, error: result.message || "Failed to send email" };
    }

    console.log("Email sent successfully:", result);
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function generateBillHTML(data: EmailBillRequest): string {
  const {
    orderId,
    customerName,
    restaurantName,
    restaurantAddress,
    restaurantPhone,
    restaurantEmail,
    restaurantWebsite,
    total,
    items,
    tableNumber,
    orderDate,
    discount,
    promotionName,
  } = data;

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const formattedDate = orderDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const invoiceNumber = orderId ? `INV-${orderId.substring(0, 8).toUpperCase()}` : `INV-${Date.now()}`;

  const itemsHTML = items.map(item => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #eee; color: #333;">${item.name}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center; color: #555;">${item.quantity}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right; color: #555;">₹${item.price.toFixed(2)}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500; color: #333;">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Receipt from ${restaurantName}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
  
  <!-- Header with Restaurant Branding -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 35px 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">🍽️ ${restaurantName}</h1>
    ${restaurantAddress ? `<p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 14px;">📍 ${restaurantAddress}</p>` : ''}
    ${restaurantPhone ? `<p style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 14px;">📞 ${restaurantPhone}</p>` : ''}
  </div>
  
  <!-- Main Content -->
  <div style="background: white; padding: 35px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    
    <!-- Greeting Section -->
    <div style="margin-bottom: 25px;">
      <h2 style="color: #333; margin: 0 0 12px 0; font-size: 22px;">Hi ${customerName},</h2>
      <p style="color: #666; margin: 0; line-height: 1.6; font-size: 15px;">
        Thank you for dining with us at <strong style="color: #667eea;">${restaurantName}</strong>! We hope you enjoyed your meal and had a wonderful experience.
      </p>
    </div>
    
    <!-- Invoice Info Card -->
    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #667eea;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">
        <strong style="color: #333;">Invoice Number:</strong> ${invoiceNumber}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">
        <strong style="color: #333;">Date:</strong> ${formattedDate}
      </p>
      ${tableNumber ? `<p style="margin: 0; font-size: 14px; color: #666;"><strong style="color: #333;">Table:</strong> ${tableNumber}</p>` : ''}
    </div>
    
    <!-- Order Details -->
    <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #667eea; padding-bottom: 8px;">📋 Order Details</h3>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="padding: 14px 8px; text-align: left; font-weight: 600; color: #333; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
          <th style="padding: 14px 8px; text-align: center; font-weight: 600; color: #333; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
          <th style="padding: 14px 8px; text-align: right; font-weight: 600; color: #333; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Rate</th>
          <th style="padding: 14px 8px; text-align: right; font-weight: 600; color: #333; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
    
    <!-- Totals Section -->
    <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
      <table style="width: 100%; font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Subtotal</td>
          <td style="padding: 8px 0; text-align: right; color: #666;">₹${subtotal.toFixed(2)}</td>
        </tr>
        ${discount && discount > 0 ? `
        <tr>
          <td style="padding: 8px 0; color: #27ae60; font-weight: 500;">
            🎉 Discount ${promotionName ? `(${promotionName})` : ''}
          </td>
          <td style="padding: 8px 0; text-align: right; color: #27ae60; font-weight: 500;">-₹${discount.toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 2px solid #dee2e6;">
          <td style="padding: 15px 0 5px 0; color: #333; font-size: 18px; font-weight: 700;">Total Amount</td>
          <td style="padding: 15px 0 5px 0; text-align: right; color: #667eea; font-size: 22px; font-weight: 700;">₹${total.toFixed(2)}</td>
        </tr>
      </table>
    </div>
    
    <!-- Payment Confirmation -->
    <div style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); padding: 15px 20px; border-radius: 8px; margin-bottom: 25px; display: flex; align-items: center;">
      <span style="font-size: 24px; margin-right: 12px;">✅</span>
      <p style="margin: 0; color: #155724; font-weight: 500;">Payment received. Thank you for your payment!</p>
    </div>
    
    <!-- Thank You Section -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; margin-bottom: 20px;">
      <p style="color: white; margin: 0; font-size: 24px; font-weight: 600;">🙏 Thank You!</p>
      <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 15px; line-height: 1.5;">
        We truly appreciate your visit. We look forward to serving you again soon!
      </p>
    </div>
    
    <!-- Contact Information -->
    <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
        <strong>Questions about your bill?</strong>
      </p>
      <p style="margin: 0; color: #888; font-size: 13px;">
        ${restaurantPhone ? `Call us at <a href="tel:${restaurantPhone}" style="color: #667eea; text-decoration: none;">${restaurantPhone}</a>` : ''}
        ${restaurantPhone && restaurantEmail ? ' or ' : ''}
        ${restaurantEmail ? `email <a href="mailto:${restaurantEmail}" style="color: #667eea; text-decoration: none;">${restaurantEmail}</a>` : ''}
        ${!restaurantPhone && !restaurantEmail ? 'Please contact us at the restaurant.' : ''}
      </p>
    </div>
    
  </div>
  
  <!-- Footer -->
  <div style="text-align: center; padding: 20px;">
    <p style="color: #888; font-size: 12px; margin: 0 0 8px 0;">
      This is an automated receipt from ${restaurantName}.
    </p>
    ${restaurantWebsite ? `<p style="margin: 0;"><a href="${restaurantWebsite}" style="color: #667eea; font-size: 12px;">Visit our website</a></p>` : ''}
    <p style="color: #aaa; font-size: 11px; margin: 10px 0 0 0;">
      © ${new Date().getFullYear()} ${restaurantName}. All rights reserved.
    </p>
  </div>
  
</body>
</html>
  `;
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
  const rateLimitResult = checkRateLimit(identifier, EMAIL_RATE_LIMIT);
  
  if (!rateLimitResult.allowed) {
    console.log(`Email rate limit exceeded for ${identifier}`);
    return createRateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const requestBody = await req.json() as EmailBillRequest;
    const { orderId, email, customerName, restaurantName, restaurantId, total, items } = requestBody;
    
    // Initialize Supabase client for DB lookup
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    let finalRestaurantName = restaurantName;
    let finalRestaurantAddress = requestBody.restaurantAddress || '';
    let finalRestaurantPhone = requestBody.restaurantPhone || '';
    
    // If restaurant name is empty or default, try to fetch from database
    if ((!restaurantName || restaurantName === 'Restaurant' || restaurantName === '') && restaurantId && supabaseUrl && supabaseServiceKey) {
      console.log('📍 Restaurant name not provided, fetching from database with ID:', restaurantId);
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: restaurant, error: dbError } = await supabase
          .from('restaurants')
          .select('name, address, phone')
          .eq('id', restaurantId)
          .single();
        
        if (!dbError && restaurant) {
          console.log('✅ Found restaurant in DB:', restaurant.name);
          finalRestaurantName = restaurant.name || 'Our Restaurant';
          finalRestaurantAddress = restaurant.address || finalRestaurantAddress;
          finalRestaurantPhone = restaurant.phone || finalRestaurantPhone;
        } else {
          console.warn('❌ Could not fetch restaurant from DB:', dbError);
          finalRestaurantName = 'Our Restaurant';
        }
      } catch (fetchError) {
        console.error('❌ Error fetching restaurant:', fetchError);
        finalRestaurantName = 'Our Restaurant';
      }
    } else if (!restaurantName || restaurantName === 'Restaurant' || restaurantName === '') {
      finalRestaurantName = 'Our Restaurant';
    }
    
    console.log("Processing email bill request:", {
      orderId,
      email: email ? `${email.substring(0, 3)}***` : 'Missing',
      customerName,
      restaurantName: finalRestaurantName,
      itemCount: items?.length || 0,
      total
    });
    
    // Validate required fields
    if (!email || !items || items.length === 0) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required parameters: email and items are required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid email format' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    // Update request body with final restaurant details (including any DB-fetched values)
    const updatedRequestBody = { 
      ...requestBody, 
      restaurantName: finalRestaurantName,
      restaurantAddress: finalRestaurantAddress,
      restaurantPhone: finalRestaurantPhone
    };

    // Generate bill HTML
    const htmlContent = generateBillHTML(updatedRequestBody);
    const subject = `Your Receipt from ${finalRestaurantName} - ₹${total.toFixed(2)}`;

    // Send email via Resend
    const emailResult = await sendEmailViaResend(email, subject, htmlContent, finalRestaurantName);

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: emailResult.error || 'Failed to send email'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      );
    }

    // Update order record if orderId provided
    if (orderId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Try to update kitchen_orders
          const { error: updateError } = await supabase
            .from('kitchen_orders')
            .update({ 
              email_sent: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

          if (updateError) {
            console.warn("Could not update kitchen_orders:", updateError);
          } else {
            console.log("✅ Order record updated with email_sent flag");
          }
        }
      } catch (dbError) {
        console.error("Database update error:", dbError);
        // Don't fail the request if DB update fails
      }
    }

    console.log("✅ Email bill sent successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bill sent successfully to ${email}`,
        emailId: emailResult.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error("❌ Unexpected error in send-email-bill function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
