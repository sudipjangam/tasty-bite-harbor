import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { StateGraph, Annotation } from "@langchain/langgraph";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define LangGraph State using modern Annotation syntax
const AgentState = Annotation.Root({
  messages: Annotation<any[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  restaurantId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  entityType: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "table",
  }),
  entityId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  customerName: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  customerPhone: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  orderPlaced: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  orderNumber: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  upiPaymentLink: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});

// Tool 1: Fetch Menu Items
async function checkMenuTool(supabase: any, restaurantId: string) {
  console.log(`Tool check_menu called for restaurant: ${restaurantId}`);
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, price, category, is_veg')
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true);
  
  if (error) {
    console.error("Error fetching menu:", error);
    return { error: error.message };
  }
  return { items: data || [] };
}

// Tool 2: Check Ingredient Stock Levels
async function checkStockTool(supabase: any, restaurantId: string, items: { menuItemId: string, quantity: number }[]) {
  console.log(`Tool check_stock called for restaurant ${restaurantId} with ${items.length} items`);
  const results = [];
  
  for (const item of items) {
    // 1. Fetch recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, name')
      .eq('menu_item_id', item.menuItemId)
      .maybeSingle();
      
    if (recipeError || !recipe) {
      // If no recipe is defined, assume pre-made item or in-stock
      results.push({ menuItemId: item.menuItemId, available: true, message: "In stock" });
      continue;
    }
    
    // 2. Fetch recipe ingredients
    const { data: ingredients, error: ingError } = await supabase
      .from('recipe_ingredients')
      .select('inventory_item_id, quantity')
      .eq('recipe_id', recipe.id);
      
    if (ingError || !ingredients || ingredients.length === 0) {
      results.push({ menuItemId: item.menuItemId, available: true, message: "In stock" });
      continue;
    }
    
    let isAvailable = true;
    const missingIngredients: string[] = [];
    
    // 3. Check inventory quantity
    for (const ing of ingredients) {
      const { data: invItem, error: invError } = await supabase
        .from('inventory_items')
        .select('name, quantity, unit')
        .eq('id', ing.inventory_item_id)
        .maybeSingle();
        
      if (invError || !invItem) {
        continue;
      }
      
      const needed = ing.quantity * item.quantity;
      if (invItem.quantity < needed) {
        isAvailable = false;
        missingIngredients.push(`${invItem.name} (need ${needed} ${invItem.unit}, have ${invItem.quantity} ${invItem.unit})`);
      }
    }
    
    results.push({
      menuItemId: item.menuItemId,
      available: isAvailable,
      message: isAvailable ? "In stock" : `Out of stock: ${missingIngredients.join(', ')}`
    });
  }
  
  return { stock_status: results };
}

// Tool 3: Insert Order and trigger Kitchen
async function placeOrderTool(
  supabase: any,
  restaurantId: string,
  customerName: string,
  customerPhone: string,
  items: { menuItemId: string, quantity: number, price: number }[],
  totalAmount: number,
  entityType: string,
  entityId: string
) {
  console.log(`Tool place_order called. Items count: ${items.length}, total: ${totalAmount}`);
  if (!items || items.length === 0) {
    return { error: "No items in order" };
  }
  
  // 1. Fetch menu item names
  const menuItemIds = items.map(i => i.menuItemId);
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, name')
    .in('id', menuItemIds);
    
  // 2. Format details
  const formattedItems = items.map(item => {
    const mi = menuItems?.find(m => m.id === item.menuItemId);
    const name = mi?.name || "Unknown Item";
    return `${item.quantity}x ${name} @${item.price}`;
  });
  
  const orderItemsForKitchen = items.map(item => {
    const mi = menuItems?.find(m => m.id === item.menuItemId);
    return {
      name: mi?.name || "Unknown Item",
      quantity: item.quantity,
      price: item.price,
      notes: [],
    };
  });
  
  // Get entity display name (Table number or room number)
  let entityName = "Guest";
  if (entityId) {
    if (entityType === 'table') {
      const { data: tbl } = await supabase
        .from('restaurant_tables')
        .select('table_number')
        .eq('id', entityId)
        .maybeSingle();
      entityName = tbl?.table_number || 'Unknown Table';
    } else {
      const { data: rm } = await supabase
        .from('rooms')
        .select('room_number')
        .eq('id', entityId)
        .maybeSingle();
      entityName = rm?.room_number || 'Unknown Room';
    }
  }
  
  // 3. Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id: restaurantId,
      customer_name: customerName || "Guest",
      customer_phone: customerPhone || "0000000000",
      items: formattedItems,
      total: totalAmount,
      status: 'pending',
      source: 'qr',
      order_type: entityType === 'table' ? 'dine-in' : 'room_service',
      payment_status: 'pending',
      is_qr_order: true,
      table_id: entityType === 'table' ? entityId : null,
      room_id: entityType === 'room' ? entityId : null,
      entity_name: entityName,
    })
    .select()
    .single();
    
  if (orderError) {
    console.error("Order insertion failed:", orderError);
    return { error: "Failed to insert order: " + orderError.message };
  }
  
  // 4. Create kitchen order
  const { error: kitchenError } = await supabase
    .from('kitchen_orders')
    .insert({
      order_id: order.id,
      restaurant_id: restaurantId,
      table_number: entityName,
      customer_name: customerName || "Guest",
      customer_phone: customerPhone || "0000000000",
      server_name: 'AI Waiter',
      items: orderItemsForKitchen,
      status: 'new',
      source: 'qr',
      order_type: entityType === 'table' ? 'dine_in' : 'room_service',
    });
    
  if (kitchenError) {
    console.error("Kitchen order creation failed:", kitchenError);
  }
  
  // 5. Update table status if dine-in
  if (entityType === 'table' && entityId) {
    await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied' })
      .eq('id', entityId);
  }
  
  // UPI details
  const { data: paymentSettings } = await supabase
    .from('payment_settings')
    .select('upi_id, upi_name')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .maybeSingle();

  let upiPaymentLink = null;
  if (paymentSettings?.upi_id) {
    const upiId = paymentSettings.upi_id;
    const businessName = paymentSettings.upi_name || 'Restaurant';
    const amount = totalAmount.toFixed(2);
    const orderRef = order.id.substring(0, 8).toUpperCase();
    upiPaymentLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName)}&am=${amount}&cu=INR&tn=Order%20${orderRef}`;
  }
  
  return {
    success: true,
    orderId: order.id,
    orderNumber: order.id.substring(0, 8).toUpperCase(),
    upiPaymentLink,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const requestData = await req.json();
    const {
      mode,
      messages: rawMessages,
      restaurantId: bodyRestaurantId,
      entityType,
      entityId,
      customerName,
      customerPhone
    } = requestData;

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key is not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let verifiedRestaurantId = "";
    
    // Auth Check
    if (mode === "ordering") {
      verifiedRestaurantId = bodyRestaurantId || "";
      if (!verifiedRestaurantId) {
        return new Response(
          JSON.stringify({ error: 'restaurantId is required for ordering mode' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } else {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'No authorization header' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      const token = authHeader.replace('Bearer ', '');
      if (supabaseUrl && Deno.env.get('SUPABASE_ANON_KEY')) {
        const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          return new Response(
            JSON.stringify({ error: 'Invalid or expired token' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
          );
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('restaurant_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.restaurant_id) {
          return new Response(
            JSON.stringify({ error: 'User profile not found or no restaurant assigned' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }

        verifiedRestaurantId = profile.restaurant_id;
      }
    }

    // Convert raw message inputs to Gemini SDK format
    const initialMessages = (rawMessages || []).map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: m.parts || [{ text: m.content || "" }]
    }));

    // Initialize Google GenAI SDK
    const ai = new GoogleGenAI({ apiKey });

    if (mode === "ordering") {
      // 1. Setup DB client using Service Role to bypass RLS for Guest Ordering
      const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

      // 2. Define tools schema for Gemini
      const functionDeclarations = [
        {
          name: "check_menu",
          description: "Get list of available food/beverage items on the menu with prices and veg status.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "check_stock",
          description: "Check if we have enough stock of ingredients to prepare menu items.",
          parameters: {
            type: "OBJECT",
            properties: {
              items: {
                type: "ARRAY",
                description: "List of items to check stock for",
                items: {
                  type: "OBJECT",
                  properties: {
                    menuItemId: { type: "STRING" },
                    quantity: { type: "NUMBER" }
                  },
                  required: ["menuItemId", "quantity"]
                }
              }
            },
            required: ["items"]
          }
        },
        {
          name: "place_order",
          description: "Submit the guest order to the kitchen. Run this ONLY after confirming all items are available and the guest explicitly says they want to order/submit.",
          parameters: {
            type: "OBJECT",
            properties: {
              items: {
                type: "ARRAY",
                description: "List of menu items in the cart.",
                items: {
                  type: "OBJECT",
                  properties: {
                    menuItemId: { type: "STRING", description: "The UUID of the menu item." },
                    quantity: { type: "NUMBER", description: "Number of items." },
                    price: { type: "NUMBER", description: "Price of a single unit of this item." }
                  },
                  required: ["menuItemId", "quantity", "price"]
                }
              },
              totalAmount: { type: "NUMBER", description: "Total price of all items combined." }
            },
            required: ["items", "totalAmount"]
          }
        }
      ];

      // Define Graph Nodes
      const callAgentNode = async (state: typeof AgentState.State) => {
        const systemPrompt = "You are a professional AI Waiter at a restaurant. Help the customer order. Use check_menu to show them options when asked. When they express interest in items, ALWAYS check stock using check_stock before confirming. Once items are confirmed available and the customer gives clear consent to place/submit the order, use place_order. Be friendly and direct.";
        
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: state.messages,
          config: {
            systemInstruction: systemPrompt,
            tools: [{ functionDeclarations }]
          }
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        const newMsg: any = { role: "model", parts: [] };

        if (part?.functionCall) {
          newMsg.parts.push({ functionCall: part.functionCall });
        } else {
          newMsg.parts.push({ text: response.text || "" });
        }

        return { messages: [newMsg] };
      };

      const executeToolsNode = async (state: typeof AgentState.State) => {
        const lastMsg = state.messages[state.messages.length - 1];
        const toolCall = lastMsg.parts?.[0]?.functionCall;
        
        if (!toolCall) return {};

        let toolResult = {};
        let orderPlacedFlag = false;
        let orderNumberVal = "";
        let upiPayLink = null;

        if (toolCall.name === "check_menu") {
          toolResult = await checkMenuTool(supabase, state.restaurantId);
        } else if (toolCall.name === "check_stock") {
          const args = toolCall.args as any;
          toolResult = await checkStockTool(supabase, state.restaurantId, args.items);
        } else if (toolCall.name === "place_order") {
          const args = toolCall.args as any;
          const orderRes = await placeOrderTool(
            supabase,
            state.restaurantId,
            state.customerName,
            state.customerPhone,
            args.items,
            args.totalAmount,
            state.entityType,
            state.entityId
          );
          toolResult = orderRes;
          if (orderRes.success) {
            orderPlacedFlag = true;
            orderNumberVal = orderRes.orderNumber;
            upiPayLink = orderRes.upiPaymentLink;
          }
        }

        const toolMsg = {
          role: "tool",
          parts: [{
            functionResponse: {
              name: toolCall.name,
              response: toolResult
            }
          }]
        };

        return {
          messages: [toolMsg],
          orderPlaced: orderPlacedFlag,
          orderNumber: orderNumberVal,
          upiPaymentLink: upiPayLink
        };
      };

      // Define Edge Routing
      const shouldContinue = (state: typeof AgentState.State) => {
        const lastMsg = state.messages[state.messages.length - 1];
        const hasToolCall = lastMsg.parts?.[0]?.functionCall !== undefined;
        return hasToolCall ? "execute_tools" : "__end__";
      };

      // Construct and Compile Graph
      const workflow = new StateGraph(AgentState)
        .addNode("call_agent", callAgentNode)
        .addNode("execute_tools", executeToolsNode)
        .addEdge("__start__", "call_agent")
        .addConditionalEdges("call_agent", shouldContinue, {
          execute_tools: "execute_tools",
          __end__: "__end__"
        })
        .addEdge("execute_tools", "call_agent");

      const app = workflow.compile();

      // Invoke Graph
      const finalState = await app.invoke({
        messages: initialMessages,
        restaurantId: verifiedRestaurantId,
        entityType: entityType || "table",
        entityId: entityId || "",
        customerName: customerName || "Guest",
        customerPhone: customerPhone || "0000000000",
      });

      const lastMessage = finalState.messages[finalState.messages.length - 1];
      const responseText = lastMessage.parts?.[0]?.text || "Processing your order request...";

      return new Response(
        JSON.stringify({
          success: true,
          restaurantId: verifiedRestaurantId,
          orderPlaced: finalState.orderPlaced,
          orderNumber: finalState.orderNumber,
          upiPaymentLink: finalState.upiPaymentLink,
          message: {
            role: "assistant",
            content: responseText,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Default Testing / Echo Mode
      const callModelNode = async (state: typeof AgentState.State) => {
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: state.messages,
        });
        const replyText = response.text || "";
        return {
          messages: [{
            role: "model",
            parts: [{ text: replyText }]
          }]
        };
      };

      const workflow = new StateGraph(AgentState)
        .addNode("call_model", callModelNode)
        .addEdge("__start__", "call_model")
        .addEdge("call_model", "__end__");

      const app = workflow.compile();

      const resultState = await app.invoke({
        messages: initialMessages,
        restaurantId: verifiedRestaurantId,
      });

      const lastMessage = resultState.messages[resultState.messages.length - 1];
      const responseText = lastMessage.parts?.[0]?.text || "";

      return new Response(
        JSON.stringify({
          success: true,
          restaurantId: verifiedRestaurantId,
          message: {
            role: "assistant",
            content: responseText,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in agentic orchestrator:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
