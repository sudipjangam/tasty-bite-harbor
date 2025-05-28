
import React, { useState, useEffect, useRef } from "react";
import { Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatInputProps = {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
};

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger input change event to enable the send button when value is set programmatically
  useEffect(() => {
    if (inputRef.current && inputRef.current.value) {
      // Create and dispatch an input event to trigger validation
      const event = new Event('input', { bubbles: true });
      inputRef.current.dispatchEvent(event);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !isLoading) {
        onSendMessage(message);
        setMessage("");
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-3"
    >
      <div className="flex-1 relative">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your restaurant..."
          className="pr-12 py-3 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={isLoading}
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 h-8 w-8"
          disabled={true}
        >
          <Mic className="h-4 w-4" />
        </Button>
      </div>
      <Button
        type="submit"
        size="icon"
        disabled={isLoading}
        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full h-10 w-10 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};

export default ChatInput;
