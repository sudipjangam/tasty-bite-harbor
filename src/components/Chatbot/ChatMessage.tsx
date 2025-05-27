
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
        "flex w-full gap-4 py-4 px-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-700 text-white flex-shrink-0 mt-1 ring-2 ring-purple-200 dark:ring-purple-800">
          <AvatarImage src="https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=40&h=40&fit=crop&crop=face" alt="AI Assistant" />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-700">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          "px-4 py-3 max-w-[80%] shadow-sm relative",
          isUser 
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md ml-4" 
            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700"
        )}
      >
        {!isUser && (
          <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1">
            <Bot className="h-3 w-3" />
            AI Assistant
          </div>
        )}
        <p 
          className={cn(
            "text-sm leading-relaxed",
            isUser ? "text-white" : "text-gray-800 dark:text-gray-200"
          )}
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
        {/* Message tail */}
        <div
          className={cn(
            "absolute w-3 h-3 rotate-45",
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 -right-1 bottom-3"
              : "bg-white dark:bg-gray-800 border-l border-b border-gray-200 dark:border-gray-700 -left-1 bottom-3"
          )}
        />
      </div>
      
      {isUser && (
        <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white flex-shrink-0 mt-1 ring-2 ring-blue-200 dark:ring-blue-800">
          <AvatarImage src="https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=40&h=40&fit=crop&crop=face" alt="User" />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;
