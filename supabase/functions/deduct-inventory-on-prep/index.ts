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
  price?: number;
}

interface IngredientRequirement {
  inventory_item_id: string;
  quantity: number;
  unit: string;
  variant_id?: string | null;
}

// Unit conversion to base units (kg for weight, l for volume)
const convertToBaseUnit = (quantity: number, fromUnit: string, toUnit: string): number => {
  const fUnit = (fromUnit || "").toLowerCase().trim();
  const tUnit = (toUnit || "").toLowerCase().trim();

  if (fUnit === tUnit) return quantity;
  
  const conversionMap: { [key: string]: { [key: string]: number } } = {
    // Weight conversions
    'g': { 'kg': 0.001, 'g': 1, 'gm': 1, 'gms': 1 },
    'gm': { 'kg': 0.001, 'g': 1, 'gm': 1, 'gms': 1 },
    'gms': { 'kg': 0.001, 'g': 1, 'gm': 1, 'gms': 1 },
    'kg': { 'kg': 1, 'g': 1000, 'gm': 1000, 'gms': 1000 },
    // Volume conversions
    'ml': { 'l': 0.001, 'ml': 1, 'ltr': 0.001, 'liter': 0.001, 'litre': 0.001 },
    'l': { 'l': 1, 'ml': 1000, 'ltr': 1, 'liter': 1, 'litre': 1 },
    'ltr': { 'l': 1, 'ml': 1000, 'ltr': 1, 'liter': 1, 'litre': 1 },
    'liter': { 'l': 1, 'ml': 1000, 'ltr': 1, 'liter': 1, 'litre': 1 },
    'litre': { 'l': 1, 'ml': 1000, 'ltr': 1, 'liter': 1, 'litre': 1 },
    // Pieces and common units
    'piece': { 'piece': 1, 'pcs': 1, 'pc': 1, 'unit': 1, 'portion': 1 },
    'pcs': { 'pcs': 1, 'piece': 1, 'pc': 1, 'unit': 1, 'portion': 1 },
    'pc': { 'pc': 1, 'piece': 1, 'pcs': 1, 'unit': 1, 'portion': 1 },
    'unit': { 'unit': 1, 'piece': 1, 'pcs': 1, 'pc': 1 },
    'portion': { 'portion': 1, 'piece': 1, 'pcs': 1 },
    'slice': { 'slice': 1, 'slices': 1, 'piece': 1 },
    'slices': { 'slice': 1, 'slices': 1, 'piece': 1 },
    'cup': { 'l': 0.24, 'ml': 240 },
    'tbsp': { 'ml': 15, 'l': 0.015 },
    'tsp': { 'ml': 5, 'l': 0.005 },
    'pack': { 'pack': 1 },
    'packet': { 'pack': 1, 'packet': 1 },
    'bottle': { 'bottle': 1 },
    'box': { 'box': 1 },
    'dozen': { 'dozen': 1, 'piece': 12, 'pcs': 12 },
  };

  const from = conversionMap[fUnit];
  if (!from || !(tUnit in from)) {
    console.warn(`Cannot convert from ${fUnit} to ${tUnit}, falling back to 1:1`);
    return quantity;
  }
  
  return quantity * from[tUnit];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. VERIFY CALLER ACCESS: Load order with user-scoped client under RLS
    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const { data: userOrder, error: userOrderError } = await userClient
      .from('orders')
      .select('id, restaurant_id')
      .eq('id', order_id)
      .single();

    if (userOrderError || !userOrder) {
      console.warn(`Unauthorized attempt to deduct inventory for order ${order_id}:`, userOrderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Access denied to order or restaurant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. SERVICE-ROLE CLIENT for atomic inventory and transaction updates
    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey || anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    console.log('Processing inventory deduction for order:', order_id);

    // 3. IDEMPOTENCY CHECK: Do not deduct twice for the same order
    const { data: existingTx, error: checkError } = await supabaseClient
      .from('inventory_transactions')
      .select('id')
      .eq('reference_id', order_id)
      .eq('transaction_type', 'usage')
      .limit(1);

    if (checkError) {
      console.error(`Error checking existing transactions for order ${order_id}:`, checkError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to check transaction status: ${checkError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingTx && existingTx.length > 0) {
      console.log(`Order ${order_id} already has inventory deducted. Skipping duplicate.`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Inventory already deducted for this order (idempotent)',
          alreadyDeducted: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Fetch full order details using service client
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, items, kitchen_items, restaurant_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error(`Failed to fetch order ${order_id}: ${orderError?.message}`);
    }

    const restaurantId = order.restaurant_id;

    // 3. Extract items from kitchen_items OR fallback to items array
    let items: OrderItem[] = [];

    if (Array.isArray(order.kitchen_items) && order.kitchen_items.length > 0) {
      items = order.kitchen_items.map((it: any) => ({
        name: typeof it.name === 'string' ? it.name : 'Unknown Item',
        quantity: Number(it.quantity) || 1,
        menuItemId: it.menuItemId || it.menu_item_id || undefined,
        price: it.price,
      }));
    } else if (Array.isArray(order.items) && order.items.length > 0) {
      items = order.items.map((it: any) => {
        if (typeof it === 'object' && it !== null) {
          return {
            name: typeof it.name === 'string' ? it.name : 'Unknown Item',
            quantity: Number(it.quantity) || 1,
            menuItemId: it.menuItemId || it.menu_item_id || undefined,
            price: it.price,
          };
        }
        if (typeof it === 'string') {
          // Parse string like "2x Chicken Burger - ₹250" or "Chicken Burger"
          const match = it.match(/^(\d+)\s*[xX]?\s*(.+?)(?:\s*-\s*[₹$€\d.,]+)?$/);
          if (match) {
            return { quantity: parseInt(match[1]), name: match[2].trim() };
          }
          return { quantity: 1, name: it.trim() };
        }
        return { quantity: 1, name: String(it) };
      });
    }

    if (items.length === 0) {
      console.log(`Order ${order_id} has no items to deduct.`);
      return new Response(
        JSON.stringify({ success: true, message: 'Order has no items' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Resolve menuItemIds by name lookup if missing
    let menuNameMap: Record<string, string> = {};
    let variantNameMap: Record<string, Record<string, string>> = {}; // menuItemId → { variantName → variantId }
    
    const { data: menuItems } = await supabaseClient
      .from('menu_items')
      .select('id, name')
      .eq('restaurant_id', restaurantId);

    if (menuItems) {
      menuNameMap = Object.fromEntries(
        menuItems.map(mi => [String(mi.name).toLowerCase().trim(), mi.id])
      );
    }

    const { data: variants } = await supabaseClient
      .from('menu_item_variants')
      .select('id, menu_item_id, name')
      .eq('restaurant_id', restaurantId);

    if (variants) {
      for (const v of variants) {
        if (!variantNameMap[v.menu_item_id]) variantNameMap[v.menu_item_id] = {};
        variantNameMap[v.menu_item_id][String(v.name).toLowerCase().trim()] = v.id;
      }
    }

    // Aggregated ingredients map: inventory_item_id -> details
    const ingredientMap = new Map<string, { quantity: number; unit: string; itemName: string }>();

    for (const item of items) {
      const itemNameLower = (item.name || '').toLowerCase().trim();
      let resolvedId = item.menuItemId;

      if (!resolvedId) {
        resolvedId = menuNameMap[itemNameLower];

        // Normalized match if direct match fails (spaces/punctuation differences only)
        if (!resolvedId) {
          const fuzzyKey = Object.keys(menuNameMap).find(k => 
            k.replace(/[^a-z0-9]/g, '') === itemNameLower.replace(/[^a-z0-9]/g, '')
          );
          if (fuzzyKey) resolvedId = menuNameMap[fuzzyKey];
        }

        // Check variant suffix e.g. "Pizza (Medium)" -> "Pizza"
        if (!resolvedId) {
          const variantMatch = itemNameLower.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
          if (variantMatch) {
            const baseName = variantMatch[1].trim();
            const variantName = variantMatch[2].trim();
            const baseId = menuNameMap[baseName];
            if (baseId) {
              const matchedVariantId = variantNameMap[baseId]?.[variantName];
              resolvedId = matchedVariantId ? `${baseId}__${matchedVariantId}` : baseId;
            }
          }
        }
      }

      let baseMenuItemId = resolvedId;
      let variantId: string | null = null;
      if (baseMenuItemId && baseMenuItemId.includes('__')) {
        const parts = baseMenuItemId.split('__');
        baseMenuItemId = parts[0];
        variantId = parts[1];
      }

      // 5. FIND RECIPE:
      // Try 1: By menu_item_id
      let recipe: { id: string } | null = null;
      if (baseMenuItemId) {
        const { data: recipeData } = await supabaseClient
          .from('recipes')
          .select('id')
          .eq('menu_item_id', baseMenuItemId)
          .eq('restaurant_id', restaurantId)
          .or('is_active.eq.true,is_active.is.null')
          .maybeSingle();

        recipe = recipeData;
      }

      // Try 2: By recipe name matching item name (if not found by menu_item_id)
      if (!recipe) {
        const cleanName = item.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
        const { data: recipeByName } = await supabaseClient
          .from('recipes')
          .select('id')
          .ilike('name', cleanName)
          .eq('restaurant_id', restaurantId)
          .or('is_active.eq.true,is_active.is.null')
          .maybeSingle();

        recipe = recipeByName;
      }

      if (!recipe) {
        console.log(`No active recipe found for item "${item.name}" (menuItemId: ${baseMenuItemId})`);
        continue;
      }

      console.log(`Found recipe ${recipe.id} for "${item.name}"`);

      // 6. Fetch ingredients
      const { data: ingredients, error: ingredientsError } = await supabaseClient
        .from('recipe_ingredients')
        .select('inventory_item_id, quantity, unit, variant_id')
        .eq('recipe_id', recipe.id);

      if (ingredientsError || !ingredients || ingredients.length === 0) {
        console.warn(`No ingredients for recipe ${recipe.id}`);
        continue;
      }

      // Resolve base vs variant ingredients
      const resolvedIngredients = new Map<string, IngredientRequirement>();
      for (const ing of ingredients as IngredientRequirement[]) {
        if (!ing.variant_id) {
          resolvedIngredients.set(ing.inventory_item_id, ing);
        }
      }

      if (variantId) {
        for (const ing of ingredients as IngredientRequirement[]) {
          if (ing.variant_id === variantId) {
            resolvedIngredients.set(ing.inventory_item_id, ing);
          }
        }
      }

      // Aggregate ingredient quantities
      for (const ing of resolvedIngredients.values()) {
        const totalQty = Number(ing.quantity) * Number(item.quantity);
        const key = ing.inventory_item_id;

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          try {
            const converted = convertToBaseUnit(totalQty, ing.unit, existing.unit);
            existing.quantity += converted;
          } catch {
            existing.quantity += totalQty;
          }
        } else {
          ingredientMap.set(key, {
            quantity: totalQty,
            unit: ing.unit,
            itemName: item.name,
          });
        }
      }
    }

    if (ingredientMap.size === 0) {
      console.log('No recipe ingredients resolved for order items.');
      return new Response(
        JSON.stringify({ success: true, message: 'No recipe ingredients to deduct' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Deduct from inventory & FIFO lots
    const deductionErrors: string[] = [];
    const deductionResults: any[] = [];

    for (const [inventoryItemId, { quantity, unit, itemName }] of ingredientMap.entries()) {
      const { data: invItem, error: invError } = await supabaseClient
        .from('inventory_items')
        .select('id, quantity, name, unit, cost_per_unit')
        .eq('id', inventoryItemId)
        .single();

      if (invError || !invItem) {
        deductionErrors.push(`Inventory item ${inventoryItemId} not found`);
        continue;
      }

      let deductAmount = quantity;
      try {
        if (unit !== invItem.unit) {
          deductAmount = convertToBaseUnit(quantity, unit, invItem.unit);
        }
      } catch (e) {
        console.warn(`Unit conversion fallback for ${invItem.name}:`, e);
      }

      // Deduct from total stock
      const newTotalQty = Math.max(0, (Number(invItem.quantity) || 0) - deductAmount);
      await supabaseClient
        .from('inventory_items')
        .update({ quantity: newTotalQty })
        .eq('id', inventoryItemId);

      // FIFO lot consumption
      const { data: lots } = await supabaseClient
        .from('inventory_lots')
        .select('id, quantity_remaining, unit_cost, purchase_date')
        .eq('inventory_item_id', inventoryItemId)
        .gt('quantity_remaining', 0)
        .order('purchase_date', { ascending: true });

      let remainingToDeduct = deductAmount;
      let totalCostAccumulated = 0;
      const lotConsumptions: { lotId: string; qty: number; unitCost: number }[] = [];

      if (lots && lots.length > 0) {
        for (const lot of lots) {
          if (remainingToDeduct <= 0) break;
          const consume = Math.min(remainingToDeduct, Number(lot.quantity_remaining) || 0);
          const lotCost = consume * (Number(lot.unit_cost) || 0);

          await supabaseClient
            .from('inventory_lots')
            .update({ quantity_remaining: Math.max(0, (Number(lot.quantity_remaining) || 0) - consume) })
            .eq('id', lot.id);

          lotConsumptions.push({
            lotId: lot.id,
            qty: consume,
            unitCost: Number(lot.unit_cost) || 0,
          });

          totalCostAccumulated += lotCost;
          remainingToDeduct -= consume;
        }
      }

      if (remainingToDeduct > 0) {
        totalCostAccumulated += remainingToDeduct * (Number(invItem.cost_per_unit) || 0);
      }

      // Insert transaction logs
      if (lotConsumptions.length > 0) {
        for (const lc of lotConsumptions) {
          await supabaseClient.from('inventory_transactions').insert({
            restaurant_id: restaurantId,
            inventory_item_id: inventoryItemId,
            transaction_type: 'usage',
            quantity_change: -lc.qty,
            unit_cost_at_time: lc.unitCost,
            total_cost: lc.qty * lc.unitCost,
            lot_id: lc.lotId,
            reference_type: 'kitchen_order',
            reference_id: order_id,
            notes: `Auto deduction for order (${itemName})`,
          });
        }
      } else {
        await supabaseClient.from('inventory_transactions').insert({
          restaurant_id: restaurantId,
          inventory_item_id: inventoryItemId,
          transaction_type: 'usage',
          quantity_change: -deductAmount,
          unit_cost_at_time: Number(invItem.cost_per_unit) || 0,
          total_cost: totalCostAccumulated,
          reference_type: 'kitchen_order',
          reference_id: order_id,
          notes: `Auto deduction for order (${itemName})`,
        });
      }

      deductionResults.push({
        item: invItem.name,
        deducted: deductAmount,
        unit: invItem.unit,
        newQuantity: newTotalQty,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inventory deducted successfully',
        itemsProcessed: ingredientMap.size,
        details: deductionResults,
        errors: deductionErrors.length > 0 ? deductionErrors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in deduct-inventory-on-prep:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});