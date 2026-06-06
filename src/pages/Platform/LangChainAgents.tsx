import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Sparkles,
  Bot,
  User,
  Database,
  ArrowRight,
  Loader2,
  CheckCircle,
  Play,
  RotateCcw,
  QrCode,
  DollarSign,
  Info,
} from "lucide-react";

interface Message {
  role: "user" | "model" | "tool";
  parts: Array<{
    text?: string;
    functionCall?: {
      name: string;
      args: any;
    };
    functionResponse?: {
      name: string;
      response: any;
    };
  }>;
}

export const LangChainAgents = () => {
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Configurations
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [agentMode, setAgentMode] = useState<"ordering" | "default">("ordering");
  
  // Ordering context params
  const [customerName, setCustomerName] = useState("John Doe");
  const [customerPhone, setCustomerPhone] = useState("9876543210");
  const [entityType, setEntityType] = useState<"table" | "room">("table");
  const [entityId, setEntityId] = useState("");
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  // State outputted by LangGraph
  const [graphState, setGraphState] = useState({
    orderPlaced: false,
    orderNumber: "",
    upiPaymentLink: null as string | null,
  });

  // Fetch all restaurants
  const { data: restaurants = [], isLoading: restaurantsLoading } = useQuery({
    queryKey: ["platform-all-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, branch_code")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-select first restaurant
  useEffect(() => {
    if (restaurants.length > 0 && !selectedRestaurantId) {
      setSelectedRestaurantId(restaurants[0].id);
    }
  }, [restaurants, selectedRestaurantId]);

  // Fetch tables for the selected restaurant
  const { data: tables = [] } = useQuery({
    queryKey: ["restaurant-tables", selectedRestaurantId],
    queryFn: async () => {
      if (!selectedRestaurantId) return [];
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id, table_number")
        .eq("restaurant_id", selectedRestaurantId)
        .order("table_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRestaurantId && entityType === "table",
  });

  // Fetch rooms for the selected restaurant
  const { data: rooms = [] } = useQuery({
    queryKey: ["restaurant-rooms", selectedRestaurantId],
    queryFn: async () => {
      if (!selectedRestaurantId) return [];
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_number")
        .eq("restaurant_id", selectedRestaurantId)
        .order("room_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRestaurantId && entityType === "room",
  });

  // Reset entityId when restaurant or type changes
  useEffect(() => {
    if (entityType === "table" && tables.length > 0) {
      setEntityId(tables[0].id);
    } else if (entityType === "room" && rooms.length > 0) {
      setEntityId(rooms[0].id);
    } else {
      setEntityId("");
    }
  }, [selectedRestaurantId, entityType, tables, rooms]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Reset chat console
  const handleResetChat = () => {
    setMessages([]);
    setGraphState({
      orderPlaced: false,
      orderNumber: "",
      upiPaymentLink: null,
    });
    toast({
      title: "Chat Reset",
      description: "Chat history and graph state cleared.",
    });
  };

  // Send message to agentic-orchestrator edge function
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isThinking) return;

    const userText = inputText.trim();
    setInputText("");

    // Append user message to local state
    const newMessages: Message[] = [
      ...messages,
      {
        role: "user",
        parts: [{ text: userText }],
      },
    ];
    setMessages(newMessages);
    setIsThinking(true);

    try {
      // Invoke the LangGraph edge function
      const { data, error } = await supabase.functions.invoke("agentic-orchestrator", {
        body: {
          mode: agentMode,
          messages: newMessages,
          restaurantId: selectedRestaurantId,
          entityType: entityType,
          entityId: entityId,
          customerName: customerName,
          customerPhone: customerPhone,
        },
      });

      if (error) throw error;

      if (data?.success) {
        // Find if there are tools executed or response texts
        // In the edge function, we return a structured JSON:
        // { success: true, message: { role: "assistant", content: "..." }, orderPlaced, orderNumber, upiPaymentLink }
        const assistantReply: Message = {
          role: "model",
          parts: [{ text: data.message?.content || "" }],
        };

        setMessages((prev) => [...prev, assistantReply]);

        // Update graph outputs if state has changed
        if (data.orderPlaced !== undefined) {
          setGraphState({
            orderPlaced: data.orderPlaced,
            orderNumber: data.orderNumber || "",
            upiPaymentLink: data.upiPaymentLink || null,
          });
        }
      } else {
        throw new Error(data?.error || "Unknown error executing agent graph");
      }
    } catch (err: any) {
      console.error("Error communicating with agent:", err);
      toast({
        title: "Agent Error",
        description: err.message || "Failed to get reply from AI Orchestrator.",
        variant: "destructive",
      });
      // Remove last user message on failure to keep trace in sync
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-violet-600" />
            LangChain Multi-Agent Console
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitor and test agent graphs, state variables, and tool invocation nodes.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleResetChat}
          className="border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/30 font-semibold gap-2 self-start rounded-xl px-4 py-2.5 shadow-sm"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Agent State
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Parameters & Configuration */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-violet-100 dark:border-violet-900/20 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-b border-violet-100/30 p-5">
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-600" />
                Agent Settings
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Define the model scope and simulation criteria.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Restaurant Selector */}
              <div className="space-y-2">
                <Label htmlFor="restaurant" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Select Target Restaurant
                </Label>
                {restaurantsLoading ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading restaurants...
                  </div>
                ) : (
                  <Select
                    value={selectedRestaurantId}
                    onValueChange={(val) => {
                      setSelectedRestaurantId(val);
                      handleResetChat();
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm focus:ring-violet-500 focus:border-violet-500">
                      <SelectValue placeholder="Choose restaurant" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {restaurants.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} ({r.branch_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Agent Mode selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Active Agent Mode
                </Label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                  <button
                    onClick={() => {
                      setAgentMode("ordering");
                      handleResetChat();
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      agentMode === "ordering"
                        ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Ordering Assistant
                  </button>
                  <button
                    onClick={() => {
                      setAgentMode("default");
                      handleResetChat();
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      agentMode === "default"
                        ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Echo Tester (No Tools)
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer / Table context inputs (only in ordering mode) */}
          {agentMode === "ordering" && (
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-violet-100 dark:border-violet-900/20 shadow-xl rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border-b border-violet-100/30 p-5">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  Simulation Parameters
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure Guest ordering session context variables.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="custName" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Guest Name
                    </Label>
                    <Input
                      id="custName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="rounded-xl text-xs h-9 border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="custPhone" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Guest Phone
                    </Label>
                    <Input
                      id="custPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="rounded-xl text-xs h-9 border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Entity Type
                    </Label>
                    <Select
                      value={entityType}
                      onValueChange={(val: "table" | "room") => setEntityType(val)}
                    >
                      <SelectTrigger className="rounded-xl text-xs h-9 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="table">Dine-in Table</SelectItem>
                        <SelectItem value="room">Hotel Room</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Select {entityType === "table" ? "Table" : "Room"}
                    </Label>
                    <Select value={entityId} onValueChange={setEntityId}>
                      <SelectTrigger className="rounded-xl text-xs h-9 border-slate-200">
                        <SelectValue placeholder={`Select ${entityType}`} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {entityType === "table"
                          ? tables.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                Table {t.table_number}
                              </SelectItem>
                            ))
                          : rooms.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                Room {r.room_number}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center: Chat Console */}
        <div className="lg:col-span-5 flex flex-col h-[600px]">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl flex flex-col h-full overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-4 shrink-0 flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-inner">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  {agentMode === "ordering" ? "AI Ordering Waiter" : "Test Graph Agent"}
                </h3>
                <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ready to simulate
                </span>
              </div>
            </CardHeader>

            {/* Chat Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400 space-y-3">
                  <MessageSquare className="h-10 w-10 opacity-20" />
                  <p className="text-xs">No active messages in agent state.</p>
                  <p className="text-[10px] text-slate-400/80 max-w-[80%] mx-auto">
                    Type a request below to initialize the LangGraph state and trigger the call_agent node.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isModel = msg.role === "model";
                  const textContent = msg.parts?.[0]?.text;
                  const isTool = msg.role === "tool";

                  if (isTool) return null; // Hide raw tool payloads from the direct message bubbles

                  return (
                    <div
                      key={index}
                      className={`flex ${isModel ? "justify-start" : "justify-end"} items-start gap-2.5`}
                    >
                      {isModel && (
                        <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center shrink-0">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div className="max-w-[85%] space-y-1">
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            isModel
                              ? "bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-800"
                              : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none"
                          }`}
                        >
                          {textContent ? (
                            <p className="whitespace-pre-wrap leading-relaxed">{textContent}</p>
                          ) : (
                            <div className="flex items-center gap-2 text-xs font-semibold py-1 text-slate-500">
                              <Database className="h-3.5 w-3.5 text-indigo-500 animate-bounce" />
                              Requested tool execution...
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 px-1">
                          {isModel ? "AI Agent" : "Guest Simulator"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Loader */}
              {isThinking && (
                <div className="flex justify-start items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none px-4 py-2.5 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </CardContent>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex gap-2">
              <Input
                placeholder="Type customer message (e.g. 'I want 2 pasta and check stock')"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isThinking || !selectedRestaurantId}
                className="flex-1 rounded-xl border-slate-200 focus-visible:ring-violet-500 focus-visible:border-violet-500"
              />
              <Button
                type="submit"
                disabled={isThinking || !inputText.trim() || !selectedRestaurantId}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-md shrink-0 px-4"
              >
                <Play className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Side: Graph Trace & State Inspector */}
        <div className="lg:col-span-3 space-y-6">
          {/* LangGraph State Card */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-violet-100 dark:border-violet-900/20 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border-b border-violet-100/30 p-4">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-violet-600" />
                LangGraph State Output
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Order Status Banner */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Order Status
                </span>
                {graphState.orderPlaced ? (
                  <div className="bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-800/30 rounded-xl p-3 space-y-1.5 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                      <CheckCircle className="h-4 w-4" />
                      Order Placed Successfully!
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">
                      Code: <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{graphState.orderNumber}</span>
                    </div>
                    {graphState.upiPaymentLink && (
                      <div className="pt-1.5 border-t border-emerald-100/50 flex flex-col gap-1">
                        <span className="text-[9px] font-semibold text-emerald-800 dark:text-emerald-400">
                          UPI Payment Intent Generated:
                        </span>
                        <a
                          href={graphState.upiPaymentLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <QrCode className="h-3 w-3" />
                          Pay with UPI Link
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-100 dark:bg-slate-850 rounded-xl p-3 text-center text-xs text-slate-500">
                    No active orders placed.
                  </div>
                )}
              </div>

              {/* Raw JSON messages log */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Trace log (JSON)
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200">
                    {messages.length} Nodes
                  </Badge>
                </div>
                <div className="bg-slate-900 rounded-xl p-3 font-mono text-[9px] text-slate-300 overflow-x-auto max-h-[220px] scrollbar-hide border border-slate-800 shadow-inner">
                  {messages.length === 0 ? (
                    <span className="text-slate-500">Empty Graph Trace.</span>
                  ) : (
                    <pre>{JSON.stringify(messages, null, 2)}</pre>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick tips card */}
          <Card className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
            <h4 className="font-semibold text-xs text-slate-800 dark:text-white flex items-center gap-1.5 mb-2">
              <Info className="h-3.5 w-3.5 text-indigo-500" />
              Developer Verification Tip
            </h4>
            <ul className="text-[10px] text-slate-500 space-y-1.5 list-disc pl-3.5">
              <li>Use <strong>check_menu</strong> by typing <i>"show me what you have on the menu"</i>.</li>
              <li>Ask the bot to check stock: <i>"do you have stock for Pepperoni Pizza?"</i>.</li>
              <li>Place the order: <i>"please go ahead and order 1 Pepperoni Pizza"</i>.</li>
              <li>Check your <strong>orders</strong> or <strong>kitchen orders</strong> tabs in the main layout afterwards to see the routed records in real-time!</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LangChainAgents;
