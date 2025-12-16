import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get all unique restaurants and their old role types
    const { data: restaurants, error: restaurantsError } = await supabaseClient
      .from('restaurants')
      .select('id');

    if (restaurantsError) throw restaurantsError;

    console.log(`Found ${restaurants.length} restaurants to migrate`);

    // For each restaurant, create roles based on existing user_role enum
    const roleTypes = ['owner', 'admin', 'manager', 'chef', 'waiter', 'cashier', 'staff', 'housekeeping'];

    for (const restaurant of restaurants) {
      console.log(`Processing restaurant ${restaurant.id}`);

      // Create all standard roles for this restaurant
      for (const roleName of roleTypes) {
        const { data: existingRole } = await supabaseClient
          .from('roles')
          .select('id')
          .eq('name', roleName)
          .eq('restaurant_id', restaurant.id)
          .single();

        if (!existingRole) {
          const { data: newRole, error: roleError } = await supabaseClient
            .from('roles')
            .insert({
              name: roleName,
              restaurant_id: restaurant.id,
              description: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} role`,
              is_deletable: roleName !== 'owner' && roleName !== 'admin',
            })
            .select()
            .single();

          if (roleError) {
            console.error(`Error creating role ${roleName} for restaurant ${restaurant.id}:`, roleError);
            continue;
          }

          console.log(`Created role: ${roleName} (${newRole.id}) for restaurant ${restaurant.id}`);

          // Grant full access to Owner and Admin roles
          if (roleName === 'owner' || roleName === 'admin') {
            const { data: components } = await supabaseClient
              .from('app_components')
              .select('id');

            if (components) {
              const roleComponents = components.map(comp => ({
                role_id: newRole.id,
                component_id: comp.id,
              }));

              await supabaseClient
                .from('role_components')
                .insert(roleComponents);

              console.log(`Granted full access to ${roleName}`);
            }
          }
        }
      }

      // Migrate user role_id from old role column
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, role, restaurant_id')
        .eq('restaurant_id', restaurant.id);

      if (profilesError) {
        console.error(`Error fetching profiles for restaurant ${restaurant.id}:`, profilesError);
        continue;
      }

      for (const profile of profiles) {
        if (!profile.role) continue;

        // Find the corresponding role for this restaurant
        const { data: role } = await supabaseClient
          .from('roles')
          .select('id')
          .eq('name', profile.role)
          .eq('restaurant_id', restaurant.id)
          .single();

        if (role) {
          await supabaseClient
            .from('profiles')
            .update({ role_id: role.id })
            .eq('id', profile.id);

          console.log(`Updated profile ${profile.id} with role_id ${role.id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Role migration completed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: 'Migration failed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});