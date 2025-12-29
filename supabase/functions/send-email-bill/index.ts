import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
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
  // Enrollment options
  includeEnrollment?: boolean; // Whether to include loyalty enrollment section
  enrollmentLink?: string; // Direct link to enrollment page
  isCustomerEnrolled?: boolean; // Skip enrollment section if already enrolled
}

// Send email via Gmail SMTP (PRIMARY)
async function sendEmailViaGmailSMTP(
  to: string,
  subject: string,
  htmlContent: string,
  restaurantName: string
): Promise<{ success: boolean; error?: string; provider?: string }> {
  const smtpUser = Deno.env.get("SMTP_USER") || Deno.env.get("GMAIL_USER");
  const smtpPass = Deno.env.get("SMTP_PASS") || Deno.env.get("GMAIL_APP_PASSWORD");
  const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");

  if (!smtpUser || !smtpPass) {
    console.log("SMTP credentials not configured");
    return { success: false, error: "SMTP credentials not configured" };
  }

  console.log(`📧 Attempting Gmail SMTP send to ${to}...`);

  try {
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: `${restaurantName} <${smtpUser}>`,
      to: to,
      subject: subject,
      content: "Please view this email in an HTML-compatible client.",
      html: htmlContent,
    });

    await client.close();
    console.log("✅ Email sent successfully via Gmail SMTP");
    return { success: true, provider: "gmail_smtp" };
  } catch (error) {
    console.error("❌ Gmail SMTP error:", error);
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
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const invoiceNumber = orderId ? `INV-${orderId.substring(0, 8).toUpperCase()}` : `INV-${Date.now()}`;

  // Build items rows
  const itemsHTML = items.map(item =>
    `<tr><td style="padding:15px;color:#4a5568;border-bottom:1px solid #e2e8f0">${item.name}</td><td style="padding:15px;color:#4a5568;border-bottom:1px solid #e2e8f0;text-align:center">${item.quantity}</td><td style="padding:15px;color:#4a5568;border-bottom:1px solid #e2e8f0;text-align:right">₹${item.price.toFixed(2)}</td><td style="padding:15px;color:#1a202c;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">₹${(item.price * item.quantity).toFixed(2)}</td></tr>`
  ).join('');

  // Build discount row
  const discountRow = discount && discount > 0
    ? `<div style="display:flex;justify-content:space-between;padding:12px 0;color:#27ae60"><span>🎉 Discount ${promotionName ? `(${promotionName})` : ''}</span><span style="font-weight:600">-₹${discount.toFixed(2)}</span></div>`
    : '';

  // Loyalty link - customer can check their points on the website
  const loyaltyLink = restaurantWebsite || data.enrollmentLink || '#';

  // Build enrollment section (for non-enrolled customers)
  const enrollmentSection = data.includeEnrollment && !data.isCustomerEnrolled && data.enrollmentLink
    ? `<div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px"><div style="font-size:40px;margin-bottom:12px">🎁</div><h3 style="color:#166534;margin:0 0 10px 0;font-size:18px;font-weight:700">Join Our Loyalty Program!</h3><p style="color:#4a5568;margin:0 0 16px 0;font-size:14px">Earn points on every order and unlock exclusive rewards</p><a href="${data.enrollmentLink}" style="display:inline-block;background:#22c55e;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">Join Now & Get 50 FREE Points →</a></div>`
    : '';

  // Build enrolled badge (for enrolled customers with link to check points)
  const enrolledBadge = data.isCustomerEnrolled
    ? `<a href="${loyaltyLink}" style="text-decoration:none;display:block"><div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px"><div style="font-size:36px;margin-bottom:10px">🏆</div><p style="color:#166534;margin:0 0 8px 0;font-size:16px;font-weight:700">You earned points on this order!</p><p style="color:#22c55e;margin:0;font-size:14px;font-weight:600">Click here to check your loyalty balance →</p></div></a>`
    : '';

  // Build contact info
  let contactInfo = '';
  if (restaurantPhone) {
    contactInfo = `Call us at <a href="tel:${restaurantPhone}" style="color:#667eea;text-decoration:none;font-weight:600">${restaurantPhone}</a>`;
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your Receipt - ${restaurantName}</title></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)"><div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:35px 30px;text-align:center"><div style="display:inline-block;width:60px;height:60px;background:white;border-radius:14px;font-size:32px;line-height:60px;margin-bottom:15px">🍽️</div><h1 style="color:white;font-size:26px;font-weight:700;margin:0">${restaurantName}</h1>${restaurantAddress ? `<p style="color:rgba(255,255,255,0.9);font-size:13px;margin:10px 0 0 0">📍 ${restaurantAddress}</p>` : ''}${restaurantPhone ? `<p style="color:rgba(255,255,255,0.9);font-size:13px;margin:5px 0 0 0">📞 ${restaurantPhone}</p>` : ''}</div><div style="padding:30px"><div style="margin-bottom:24px"><h2 style="color:#1a202c;font-size:22px;font-weight:700;margin:0 0 8px 0">👋 Hi ${customerName},</h2><p style="color:#4a5568;line-height:1.6;margin:0;font-size:15px">Thank you for dining with us at <strong>${restaurantName}</strong>! We hope you enjoyed your meal.</p></div><div style="background:#fef9e7;border-radius:12px;padding:20px;margin-bottom:24px;border-left:4px solid #f39c12"><div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:#7f8c8d;font-size:13px;font-weight:600">🧾 Invoice</span><span style="color:#2c3e50;font-weight:600">${invoiceNumber}</span></div><div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:#7f8c8d;font-size:13px;font-weight:600">📅 Date</span><span style="color:#2c3e50;font-weight:600">${formattedDate}</span></div>${tableNumber ? `<div style="display:flex;justify-content:space-between"><span style="color:#7f8c8d;font-size:13px;font-weight:600">🪑 Table</span><span style="color:#2c3e50;font-weight:600">${tableNumber}</span></div>` : ''}</div><div style="margin-bottom:24px"><h3 style="color:#1a202c;font-size:16px;font-weight:700;margin:0 0 15px 0;display:flex;align-items:center;gap:8px"><span>📦</span> Order Details</h3><div style="background:#f8fafc;border-radius:12px;overflow:hidden"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#667eea"><th style="color:white;font-weight:600;font-size:12px;text-transform:uppercase;padding:14px 15px;text-align:left">Item</th><th style="color:white;font-weight:600;font-size:12px;text-transform:uppercase;padding:14px 15px;text-align:center">Qty</th><th style="color:white;font-weight:600;font-size:12px;text-transform:uppercase;padding:14px 15px;text-align:right">Rate</th><th style="color:white;font-weight:600;font-size:12px;text-transform:uppercase;padding:14px 15px;text-align:right">Amount</th></tr></thead><tbody>${itemsHTML}</tbody></table></div><div style="margin-top:16px;padding:16px;background:#f8fafc;border-radius:8px"><div style="display:flex;justify-content:space-between;padding:8px 0;color:#4a5568;font-size:14px"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>${discountRow}<div style="display:flex;justify-content:space-between;border-top:2px solid #667eea;margin-top:12px;padding-top:12px;font-size:18px;font-weight:700"><span style="color:#1a202c">Total</span><span style="color:#667eea">₹${total.toFixed(2)}</span></div></div></div><div style="background:#e8f5e9;border-radius:12px;padding:16px;margin-bottom:24px;display:flex;align-items:center;gap:12px"><span style="font-size:28px">✅</span><span style="color:#2e7d32;font-weight:600;font-size:15px">Payment received. Thank you!</span></div><div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;padding:28px;text-align:center;margin-bottom:20px"><div style="font-size:42px;margin-bottom:12px">🙏</div><h3 style="color:white;font-size:22px;margin:0 0 8px 0;font-weight:700">Thank You!</h3><p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px">We appreciate your visit. See you again soon!</p></div>${enrollmentSection}${enrolledBadge}</div><div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0"><p style="color:#4a5568;font-size:14px;margin:0 0 8px 0;font-weight:600">💬 Questions about your bill?</p><p style="color:#718096;font-size:14px;margin:0">${contactInfo || 'Contact us at the restaurant'}</p></div></div><p style="text-align:center;color:#a0aec0;font-size:12px;margin:20px 0 0 0">© ${new Date().getFullYear()} ${restaurantName}</p></div></body></html>`;
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
    let restaurantSlug = '';
    let isCustomerEnrolled = requestBody.isCustomerEnrolled || false;
    
    // If restaurant name is empty or default, try to fetch from database
    if (restaurantId && supabaseUrl && supabaseServiceKey) {
      console.log('📍 Fetching restaurant details from database with ID:', restaurantId);
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: restaurant, error: dbError } = await supabase
          .from('restaurants')
          .select('name, address, phone, slug')
          .eq('id', restaurantId)
          .single();
        
        if (!dbError && restaurant) {
          console.log('✅ Found restaurant in DB:', restaurant.name);
          if (!restaurantName || restaurantName === 'Restaurant' || restaurantName === '') {
            finalRestaurantName = restaurant.name || 'Our Restaurant';
          }
          finalRestaurantAddress = restaurant.address || finalRestaurantAddress;
          finalRestaurantPhone = restaurant.phone || finalRestaurantPhone;
          restaurantSlug = restaurant.slug || '';
        } else {
          console.warn('❌ Could not fetch restaurant from DB:', dbError);
          if (!restaurantName || restaurantName === 'Restaurant' || restaurantName === '') {
            finalRestaurantName = 'Our Restaurant';
          }
        }
        
        // Check if customer is already enrolled in loyalty program
        if (email && !isCustomerEnrolled) {
          const { data: customer } = await supabase
            .from('customers')
            .select('loyalty_enrolled')
            .eq('restaurant_id', restaurantId)
            .eq('email', email.toLowerCase())
            .single();
          
          if (customer?.loyalty_enrolled) {
            isCustomerEnrolled = true;
            console.log('✅ Customer is already enrolled in loyalty program');
          }
        }
      } catch (fetchError) {
        console.error('❌ Error fetching restaurant:', fetchError);
        if (!restaurantName || restaurantName === 'Restaurant' || restaurantName === '') {
          finalRestaurantName = 'Our Restaurant';
        }
      }
    } else if (!restaurantName || restaurantName === 'Restaurant' || restaurantName === '') {
      finalRestaurantName = 'Our Restaurant';
    }
    
    // Build enrollment link if we have a slug
    const enrollmentLink = restaurantSlug 
      ? `${req.headers.get('origin') || 'https://your-domain.com'}/enroll/${restaurantSlug}`
      : requestBody.enrollmentLink || '';
    
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
      restaurantPhone: finalRestaurantPhone,
      includeEnrollment: requestBody.includeEnrollment !== false, // Default to true
      enrollmentLink: enrollmentLink,
      isCustomerEnrolled: isCustomerEnrolled
    };

    // Generate bill HTML
    const htmlContent = generateBillHTML(updatedRequestBody);
    const subject = `Your Receipt from ${finalRestaurantName} - ₹${total.toFixed(2)}`;

    // Send email via Gmail SMTP
    console.log('📧 Sending bill email to:', email);
    const emailResult = await sendEmailViaGmailSMTP(email, subject, htmlContent, finalRestaurantName);
    console.log('📧 Email result:', emailResult);

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
      // Return 200 with success: false so client can see the specific error message
      return new Response(
        JSON.stringify({ 
          success: false,
          error: emailResult.error || 'Failed to send email',
          debug_provider: emailResult.provider
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
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
        provider: emailResult.provider
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
