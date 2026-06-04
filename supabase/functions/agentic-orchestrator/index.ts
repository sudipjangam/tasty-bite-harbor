import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ChatGoogleGenerativeAI } from "npm:@langchain/google-genai@2.1.31";
import { StateGraph, Annotation } from "npm:@langchain/langgraph@0.2.34";
import { BaseMessage, HumanMessage, AIMessage } from "npm:@langchain/core@0.3.0/messages";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define LangGraph State using modern Annotation syntax
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  restaurantId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'No authorization header' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );
  }

  try {
    const requestData = await req.json();
    const { messages: rawMessages } = requestData;

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key is not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Authenticate user & fetch their restaurant_id to secure the request
    let verifiedRestaurantId = "";
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired authentication token' }),
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
    } else {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Convert raw message inputs to LangChain message classes
    const initialMessages: BaseMessage[] = (rawMessages || []).map((m: any) => {
      if (m.role === 'user' || m.role === 'human') {
        return new HumanMessage(m.content);
      }
      return new AIMessage(m.content);
    });

    // Initialize LangChain Gemini model
    const model = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      modelName: "gemini-1.5-flash",
      maxOutputTokens: 2048,
    });

    // Define simple node agent
    const callModelNode = async (state: typeof AgentState.State) => {
      const response = await model.invoke(state.messages);
      return { messages: [response] };
    };

    // Construct simple graph to test infrastructure
    const workflow = new StateGraph(AgentState)
      .addNode("call_model", callModelNode)
      .addEdge("__start__", "call_model")
      .addEdge("call_model", "__end__");

    const app = workflow.compile();

    // Run the graph with initial state
    const resultState = await app.invoke({
      messages: initialMessages,
      restaurantId: verifiedRestaurantId,
    });

    const lastMessage = resultState.messages[resultState.messages.length - 1];

    return new Response(
      JSON.stringify({
        success: true,
        restaurantId: verifiedRestaurantId,
        message: {
          role: "assistant",
          content: lastMessage.content,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in agentic orchestrator:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
