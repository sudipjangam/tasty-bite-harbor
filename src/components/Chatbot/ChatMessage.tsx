
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

type ChatMessageProps = {
  message: {
    role: "user" | "assistant";
    content: string;
  };
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";

  // Function to format message content with markdown-like syntax
  const formatContent = (content: string) => {
    // Replace ** with bold styling
    let formattedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace * and - list items with proper bullet points
    formattedContent = formattedContent.replace(/^[*\-] (.*)$/gm, '• $1');
    
    // Add line breaks
    formattedContent = formattedContent.replace(/\n/g, '<br />');
    
    return formattedContent;
  };

  return (
    <div
      className={cn(
        "flex w-full gap-3 py-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300 flex-shrink-0 mt-1">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          "px-4 py-3 max-w-[85%] shadow-sm",
          isUser 
            ? "chat-bubble-user bg-primary text-white rounded-2xl rounded-br-none" 
            : "chat-bubble-ai bg-muted text-foreground rounded-2xl rounded-bl-none"
        )}
      >
        <p 
          className="text-sm" 
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 bg-primary text-white flex-shrink-0 mt-1">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;
