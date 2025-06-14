import React, { useRef, useEffect } from "react";
import { Loader2, Minimize2, Maximize2, X, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import FileUploadButton from "./FileUploadButton";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  isUploading: boolean;
  isMaximized: boolean;
  onSendMessage: (message: string) => void;
  onClose: () => void;
  onToggleMaximize: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  embedded?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  isUploading,
  isMaximized,
  onSendMessage,
  onClose,
  onToggleMaximize,
  onFileUpload,
  fileInputRef,
  embedded = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // If embedded in a page, use a different style with proper height management
  if (embedded) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 backdrop-blur-sm rounded-2xl overflow-hidden">
        {/* Header - Fixed height */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Restaurant AI Assistant</h3>
              <p className="text-xs text-purple-100 flex items-center gap-2">
                <Bot className="h-3 w-3" />
                Powered by advanced AI with full database access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1">
                <Loader2 className="h-3 w-3 animate-spin text-purple-200" />
                <span className="text-xs text-purple-100">Thinking...</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Messages Area - Flexible height with scroll, limited max height */}
        <div className="flex-1 min-h-0 overflow-hidden" style={{ maxHeight: 'calc(100% - 120px)' }}>
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-3 shadow-xl">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                    Welcome to your Restaurant AI Assistant!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3 max-w-md leading-relaxed text-sm">
                    I have access to all your restaurant data - sales, inventory, staff, customers, orders, menu items, suppliers, reservations, and more!
                  </p>
                  <div className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl p-2">
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                      💡 Try asking: "What were my sales this week?" or click a sample question above
                    </p>
                  </div>
                </div>
              )}
              
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              
              {isLoading && (
                <div className="flex items-center gap-3 py-2 px-2">
                  <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                  <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-gray-200/50 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-gray-700 font-medium">AI is analyzing your data...</span>
                    </div>
                  </div>
                </div>
              )}
              
              {isUploading && (
                <div className="flex items-center gap-3 py-2 px-2">
                  <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                  <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-gray-200/50 shadow-lg">
                    <p className="text-sm text-gray-700 font-medium">Processing your file...</p>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
        
        {/* Input Area - Fixed height at bottom */}
        <div className="flex-shrink-0 p-3 bg-white/80 backdrop-blur-sm border-t border-gray-200/50">
          <div className="mb-2">
            <FileUploadButton 
              fileInputRef={fileInputRef} 
              onFileUpload={onFileUpload} 
              isDisabled={isUploading || isLoading} 
            />
          </div>
          <ChatInput onSendMessage={onSendMessage} isLoading={isLoading || isUploading} />
        </div>
      </div>
    );
  }

  const chatWindowClasses = isMaximized 
    ? "fixed inset-4 md:inset-10 h-auto w-auto max-w-none shadow-2xl flex flex-col z-50 animate-in fade-in bg-white dark:bg-gray-900 rounded-xl overflow-hidden"
    : "fixed bottom-6 right-6 w-80 sm:w-96 h-[600px] shadow-2xl flex flex-col z-50 animate-in fade-in slide-in-from-bottom-10 bg-white dark:bg-gray-900 rounded-xl overflow-hidden";

  return (
    <div className={chatWindowClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Restaurant Assistant</h3>
            <p className="text-xs text-purple-100">Ask me anything</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-purple-200 mr-2" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMaximize}
            className="text-white hover:bg-white/10 h-8 w-8"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="p-4 space-y-1">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-3 py-4 px-2">
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
              <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          {isUploading && (
            <div className="flex items-center gap-3 py-4 px-2">
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
              <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700 shadow-sm">
                <p className="text-sm text-gray-600 dark:text-gray-400">Processing your file...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="mb-2">
          <FileUploadButton 
            fileInputRef={fileInputRef} 
            onFileUpload={onFileUpload} 
            isDisabled={isUploading || isLoading} 
          />
        </div>
        <ChatInput onSendMessage={onSendMessage} isLoading={isLoading || isUploading} />
      </div>
    </div>
  );
};

export default ChatWindow;
