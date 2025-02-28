
import React, { useState, useRef, useEffect } from "react";
import { X, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your restaurant dashboard assistant. How can I help you today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    const userMessage: Message = {
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      console.log("Calling chat-with-api function with messages:", [...messages, userMessage]);
      
      const { data, error } = await supabase.functions.invoke('chat-with-api', {
        body: { messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })) },
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw new Error(`Function error: ${error.message}`);
      }

      if (!data) {
        throw new Error("No data returned from function");
      }

      console.log("Response data:", data);
      
      // Extract the assistant message from the response
      const assistantMessage = data.choices?.[0]?.message;
      
      if (assistantMessage && assistantMessage.content) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantMessage.content },
        ]);
      } else if (data.error) {
        throw new Error(`API error: ${data.error}`);
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      console.error("Error calling API:", error);
      
      // Show error message to user
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: "I'm sorry, I encountered an error. Please check that the API keys are configured correctly in the Supabase Edge Function secrets." 
        },
      ]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response from API. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat bubble button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] shadow-xl flex flex-col z-50 animate-in fade-in slide-in-from-bottom-10">
          <div className="flex items-center justify-between border-b p-3 bg-purple-600 text-white rounded-t-lg">
            <h3 className="font-semibold">Restaurant Assistant</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-purple-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Assistant is typing...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </Card>
      )}
    </>
  );
};

export default Chatbot;
