
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, User, Sparkles } from "lucide-react";
import DOMPurify from "dompurify";

type ChatMessageProps = {
  message: {
    role: "user" | "assistant";
    content: string;
  };
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";

  // Function to format message content with markdown-like syntax and sanitize HTML
  const formatContent = (content: string) => {
    // Replace ** with bold styling
    let formattedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace * and - list items with proper bullet points
    formattedContent = formattedContent.replace(/^[*\-] (.*)$/gm, '• $1');
    
    // Add line breaks
    formattedContent = formattedContent.replace(/\n/g, '<br />');
    
    // Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(formattedContent, {
      ALLOWED_TAGS: ['strong', 'br'],
      ALLOWED_ATTR: []
    });
  };

  return (
    <div
      className={cn(
        "flex w-full gap-4 py-6 px-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-700 text-white flex-shrink-0 mt-1 ring-4 ring-purple-200/50 dark:ring-purple-800/50 shadow-lg">
          <AvatarImage src="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=40&h=40&fit=crop&crop=face" alt="AI Assistant" />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-700">
            <Bot className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          "px-6 py-4 max-w-[80%] shadow-lg relative backdrop-blur-sm",
          isUser 
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl rounded-br-lg ml-4 border border-indigo-400/20" 
            : "bg-white/90 text-gray-900 dark:bg-gray-800/90 dark:text-gray-100 rounded-3xl rounded-bl-lg border border-gray-200/50 dark:border-gray-700/50"
        )}
      >
        {!isUser && (
          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            Restaurant AI Assistant
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
            "absolute w-4 h-4 rotate-45",
            isUser
              ? "bg-gradient-to-br from-indigo-500 to-purple-600 -right-1 bottom-4"
              : "bg-white/90 dark:bg-gray-800/90 border-l border-b border-gray-200/50 dark:border-gray-700/50 -left-1 bottom-4"
          )}
        />
      </div>
      
      {isUser && (
        <Avatar className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex-shrink-0 mt-1 ring-4 ring-blue-200/50 dark:ring-blue-800/50 shadow-lg">
          <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face" alt="User" />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600">
            <User className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;
