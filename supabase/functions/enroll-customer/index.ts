import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getRequestIdentifier,
  RATE_LIMITS,
} from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrollmentRequest {
  slug: string;
  name: string;
  email?: string;
  phone?: string;
  birthday?: string;
  source?: 'qr_code' | 'link' | 'invitation';
}

interface EnrollmentResponse {
  success: boolean;
  message: string;
  customer?: {
    id: string;
    name: string;
    loyaltyPoints: number;
    tier: string;
  };
  error?: string;
}

const WELCOME_POINTS = 50;

serve(async (req: Request) => {
  console.log(`${req.method} request to enroll-customer at ${new Date().toISOString()}`);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // Rate limiting — prevent spam enrollments (SENSITIVE: 10 req/min)
  const identifier = getRequestIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.SENSITIVE);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const querySlug = url.searchParams.get('slug');
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const { action, slug: bodySlug, name, email, phone, birthday, source = 'qr_code' } = body;
    const targetSlug = querySlug || bodySlug;

    // Action / GET request to fetch public restaurant info by slug (bypassing RLS with service role)
    if (req.method === 'GET' || action === 'get_restaurant') {
      if (!targetSlug) {
        return new Response(
          JSON.stringify({ success: false, error: 'Restaurant slug is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      let restaurantData = null;
      const { data: resBySlug } = await supabase
        .from('restaurants')
        .select('id, name, description, slug')
        .ilike('slug', targetSlug.toLowerCase())
        .maybeSingle();

      if (resBySlug) {
        restaurantData = resBySlug;
      } else {
        const { data: resByName } = await supabase
          .from('restaurants')
          .select('id, name, description, slug')
          .ilike('name', `%${targetSlug.replace(/-/g, ' ')}%`)
          .limit(1)
          .maybeSingle();
        if (resByName) restaurantData = resByName;
      }

      if (!restaurantData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Restaurant not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, restaurant: restaurantData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const slug = targetSlug;

    // Validate required fields
    if (!slug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurant slug is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!name || name.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name is required (minimum 2 characters)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!email && !phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either email or phone is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid email format' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Validate phone format if provided (basic validation)
    if (phone && phone.replace(/\D/g, '').length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number must have at least 10 digits' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Find restaurant by ID, slug, or name
    let restaurant = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    if (isUuid) {
      const { data: resById } = await supabase
        .from('restaurants')
        .select('id, name, organization_id')
        .eq('id', slug)
        .maybeSingle();
      if (resById) restaurant = resById;
    }

    if (!restaurant) {
      const { data: resBySlug } = await supabase
        .from('restaurants')
        .select('id, name, organization_id')
        .ilike('slug', slug.toLowerCase())
        .maybeSingle();
      if (resBySlug) restaurant = resBySlug;
    }

    if (!restaurant) {
      const { data: resByName } = await supabase
        .from('restaurants')
        .select('id, name, organization_id')
        .ilike('name', `%${slug.replace(/-/g, ' ')}%`)
        .limit(1)
        .maybeSingle();
      if (resByName) restaurant = resByName;
    }

    if (!restaurant) {
      console.error('Restaurant not found:', slug);
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurant not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check for existing customer with same email or phone
    let existingCustomer = null;
    
    if (email) {
      const { data: emailCustomer } = await supabase
        .from('customers')
        .select('id, name, loyalty_points, loyalty_enrolled')
        .eq('restaurant_id', restaurant.id)
        .eq('email', email.toLowerCase())
        .single();
      
      if (emailCustomer) existingCustomer = emailCustomer;
    }
    
    if (!existingCustomer && phone) {
      const { data: phoneCustomer } = await supabase
        .from('customers')
        .select('id, name, loyalty_points, loyalty_enrolled')
        .eq('restaurant_id', restaurant.id)
        .eq('phone', phone)
        .single();
      
      if (phoneCustomer) existingCustomer = phoneCustomer;
    }

    // If customer already exists and is enrolled, return friendly message
    if (existingCustomer?.loyalty_enrolled) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "You're already enrolled! Welcome back!",
          customer: {
            id: existingCustomer.id,
            name: existingCustomer.name,
            loyaltyPoints: existingCustomer.loyalty_points || 0,
            tier: 'Bronze'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let customerId = existingCustomer?.id;
    let customerPoints = existingCustomer?.loyalty_points || 0;

    // If customer exists but not enrolled, update them
    if (existingCustomer) {
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          loyalty_enrolled: true,
          loyalty_points: customerPoints + WELCOME_POINTS,
          loyalty_points_last_updated: new Date().toISOString(),
          birthday: birthday || undefined,
          organization_id: restaurant.organization_id || undefined,
        })
        .eq('id', existingCustomer.id);

      if (updateError) {
        console.error('Error updating customer:', updateError);
        throw updateError;
      }

      customerPoints += WELCOME_POINTS;
    } else {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          restaurant_id: restaurant.id,
          organization_id: restaurant.organization_id || null,
          name: name.trim(),
          email: email?.toLowerCase() || null,
          phone: phone || null,
          birthday: birthday || null,
          loyalty_enrolled: true,
          loyalty_points: WELCOME_POINTS,
          loyalty_points_last_updated: new Date().toISOString(),
          tags: ['self-enrolled'],
        })
        .select('id, name, loyalty_points')
        .single();

      if (createError) {
        console.error('Error creating customer:', createError);
        
        // Check for unique constraint violation
        if (createError.code === '23505') {
          return new Response(
            JSON.stringify({ success: false, error: 'This email or phone is already registered' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
          );
        }
        
        throw createError;
      }

      customerId = newCustomer.id;
      customerPoints = WELCOME_POINTS;
    }

    // Record the enrollment
    const userAgent = req.headers.get('user-agent') || '';
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     '0.0.0.0';

    await supabase
      .from('loyalty_enrollments')
      .insert({
        restaurant_id: restaurant.id,
        customer_id: customerId,
        name: name.trim(),
        email: email?.toLowerCase() || null,
        phone: phone || null,
        birthday: birthday || null,
        source,
        status: 'approved',
        welcome_points_awarded: WELCOME_POINTS,
        approved_at: new Date().toISOString(),
        user_agent: userAgent,
        metadata: {
          enrolled_via: source,
          timestamp: new Date().toISOString(),
        }
      });

    // Record loyalty transaction for welcome points
    await supabase
      .from('loyalty_transactions')
      .insert({
        restaurant_id: restaurant.id,
        customer_id: customerId,
        points: WELCOME_POINTS,
        transaction_type: 'earn',
        source: 'enrollment',
        notes: 'Welcome bonus for joining loyalty program',
      });

    // Send welcome email if email provided
    if (email) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            template: 'welcome',
            templateData: {
              customerName: name,
              loyaltyPoints: customerPoints,
              tier: 'Bronze',
            },
            restaurantId: restaurant.id,
          }),
        });
        console.log('Welcome email sent to:', email);
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError);
        // Don't fail the enrollment if email fails
      }
    }

    console.log(`Successfully enrolled customer ${customerId} for restaurant ${restaurant.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Welcome to ${restaurant.name}! You've earned ${WELCOME_POINTS} bonus points!`,
        customer: {
          id: customerId,
          name: name.trim(),
          loyaltyPoints: customerPoints,
          tier: 'Bronze',
        },
      } as EnrollmentResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    );

  } catch (error) {
    console.error('Enrollment error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to complete enrollment. Please try again.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
