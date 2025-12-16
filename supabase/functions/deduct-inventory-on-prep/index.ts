import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderItem {
  name: string;
  quantity: number;
  menuItemId?: string;
}

interface IngredientRequirement {
  inventory_item_id: string;
  quantity: number;
  unit: string;
}

// Unit conversion to base units (kg for weight, l for volume)
const convertToBaseUnit = (quantity: number, fromUnit: string, toUnit: string): number => {
  const conversionMap: { [key: string]: { [key: string]: number } } = {
    // Weight conversions to kg
    'g': { 'kg': 0.001, 'g': 1 },
    'kg': { 'kg': 1, 'g': 1000 },
    // Volume conversions to l
    'ml': { 'l': 0.001, 'ml': 1 },
    'l': { 'l': 1, 'ml': 1000 },
    // Pieces
    'piece': { 'piece': 1 },
    'cup': { 'l': 0.24, 'ml': 240 },
    'tbsp': { 'ml': 15, 'l': 0.015 },
    'tsp': { 'ml': 5, 'l': 0.005 },
  };

  if (fromUnit === toUnit) return quantity;
  
  const from = conversionMap[fromUnit];
  if (!from || !(toUnit in from)) {
    throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}`);
  }
  
  return quantity * from[toUnit];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { order_id } = await req.json()
    console.log('Processing inventory deduction for order:', order_id);

    // Get the kitchen order
    const { data: kitchenOrder, error: orderError } = await supabaseClient
      .from('kitchen_orders')
      .select('items, restaurant_id')
      .eq('id', order_id)
      .single();

    if (orderError || !kitchenOrder) {
      throw new Error(`Failed to fetch order: ${orderError?.message}`);
    }

    console.log('Kitchen order found:', kitchenOrder);

    const items = kitchenOrder.items as OrderItem[];
    const restaurantId = kitchenOrder.restaurant_id;

    // Resolve missing menuItemIds by name lookup (case-insensitive)
    let menuNameMap: Record<string, string> = {};
    const needsResolution = items.some(i => !i.menuItemId);
    if (needsResolution) {
      const { data: menuItems, error: menuErr } = await supabaseClient
        .from('menu_items')
        .select('id, name')
        .eq('restaurant_id', restaurantId);
      if (menuErr) {
        console.error('Failed to fetch menu items for resolution:', menuErr);
      } else {
        menuNameMap = Object.fromEntries((menuItems || []).map(mi => [String(mi.name).toLowerCase(), mi.id]));
      }
    }

    // Map to store aggregated ingredient quantities
    const ingredientMap = new Map<string, { quantity: number; unit: string; itemName: string }>();

    // Process each item in the order
    for (const item of items) {
      if (!item.menuItemId) {
        const resolvedId = menuNameMap[(item.name || '').toLowerCase?.() ?? ''];
        if (resolvedId) {
          item.menuItemId = resolvedId;
          console.log(`Resolved menuItemId for ${item.name}: ${resolvedId}`);
        } else {
          console.log(`Skipping item ${item.name} - no menuItemId`);
          continue;
        }
      }

      // Find recipe linked to this menu item
      const { data: recipe, error: recipeError } = await supabaseClient
        .from('recipes')
        .select('id')
        .eq('menu_item_id', item.menuItemId)
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .maybeSingle();

      if (!recipe) {
        console.log(`No recipe found for menu item ${item.menuItemId} (${item.name})`);
        continue;
      }

      console.log(`Found recipe ${recipe.id} for ${item.name}`);

      // Get ingredients for this recipe
      const { data: ingredients, error: ingredientsError } = await supabaseClient
        .from('recipe_ingredients')
        .select('inventory_item_id, quantity, unit')
        .eq('recipe_id', recipe.id);

      if (ingredientsError || !ingredients) {
        console.error(`Failed to fetch ingredients for recipe ${recipe.id}:`, ingredientsError);
        continue;
      }

      // Aggregate ingredients
      for (const ingredient of ingredients as IngredientRequirement[]) {
        const totalQuantity = ingredient.quantity * item.quantity;
        const key = ingredient.inventory_item_id;

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          // Convert to same unit and add
          try {
            const convertedQuantity = convertToBaseUnit(totalQuantity, ingredient.unit, existing.unit);
            existing.quantity += convertedQuantity;
          } catch (e) {
            console.error(`Unit conversion error for ${key}:`, e);
            existing.quantity += totalQuantity; // Fallback: just add if units match
          }
        } else {
          ingredientMap.set(key, {
            quantity: totalQuantity,
            unit: ingredient.unit,
            itemName: item.name
          });
        }
      }
    }

    console.log('Aggregated ingredients:', Object.fromEntries(ingredientMap));

    // If no ingredients to deduct, return success
    if (ingredientMap.size === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recipe ingredients to deduct' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct from inventory in a transaction-like manner
    const deductionErrors: string[] = [];

    for (const [inventoryItemId, { quantity, unit, itemName }] of ingredientMap.entries()) {
      // Get current inventory
      const { data: inventoryItem, error: invError } = await supabaseClient
        .from('inventory_items')
        .select('quantity, name, unit')
        .eq('id', inventoryItemId)
        .single();

      if (invError || !inventoryItem) {
        deductionErrors.push(`Inventory item ${inventoryItemId} not found`);
        continue;
      }

      console.log(`Processing ${inventoryItem.name}: current ${inventoryItem.quantity} ${inventoryItem.unit}, need ${quantity} ${unit}`);

      // Convert recipe unit to inventory unit
      let deductAmount = quantity;
      try {
        if (unit !== inventoryItem.unit) {
          deductAmount = convertToBaseUnit(quantity, unit, inventoryItem.unit);
        }
      } catch (e) {
        console.error(`Conversion error for ${inventoryItem.name}:`, e);
        deductionErrors.push(`Unit mismatch for ${inventoryItem.name}: recipe uses ${unit}, inventory uses ${inventoryItem.unit}`);
        continue;
      }

      // Check if sufficient stock
      if (inventoryItem.quantity < deductAmount) {
        deductionErrors.push(
          `Insufficient stock for ${inventoryItem.name}: need ${deductAmount.toFixed(3)} ${inventoryItem.unit}, only ${inventoryItem.quantity} ${inventoryItem.unit} available (for ${itemName})`
        );
        continue;
      }

      // Deduct from inventory
      const newQuantity = inventoryItem.quantity - deductAmount;
      const { error: updateError } = await supabaseClient
        .from('inventory_items')
        .update({ quantity: newQuantity })
        .eq('id', inventoryItemId);

      if (updateError) {
        deductionErrors.push(`Failed to update ${inventoryItem.name}: ${updateError.message}`);
        continue;
      }

      // Create transaction record
      await supabaseClient.from('inventory_transactions').insert({
        restaurant_id: restaurantId,
        inventory_item_id: inventoryItemId,
        transaction_type: 'usage',
        quantity_change: -deductAmount,
        reference_type: 'kitchen_order',
        reference_id: order_id,
        notes: `Used for order preparation`
      });

      console.log(`Successfully deducted ${deductAmount} ${inventoryItem.unit} of ${inventoryItem.name}`);
    }

    // If there were errors, return them
    if (deductionErrors.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          errors: deductionErrors 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Inventory deducted successfully',
        itemsProcessed: ingredientMap.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in deduct-inventory-on-prep:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})