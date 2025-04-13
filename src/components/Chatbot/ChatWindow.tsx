
import React, { useRef, useEffect } from "react";
import { Loader2, Minimize2, Maximize2, X } from "lucide-react";
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

  // If embedded in a page, use a different style
  if (embedded) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center justify-between border-b p-3 bg-primary text-white rounded-t-lg">
          <h3 className="font-semibold flex items-center gap-2">
            <div className="bg-white/20 p-1 rounded">
              <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </div>
            Restaurant AI Assistant
          </h3>
        </div>
        
        <ScrollArea className="flex-1 p-3 space-y-3 bg-background min-h-[500px] max-h-[500px]">
          <div className="space-y-2">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Assistant is thinking...</p>
              </div>
            )}
            {isUploading && (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading and processing file...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-2 bg-background border-t">
          <FileUploadButton 
            fileInputRef={fileInputRef} 
            onFileUpload={onFileUpload} 
            isDisabled={isUploading || isLoading} 
          />
          <ChatInput onSendMessage={onSendMessage} isLoading={isLoading || isUploading} />
        </div>
      </div>
    );
  }

  const chatWindowClasses = isMaximized 
    ? "fixed inset-4 md:inset-10 h-auto w-auto max-w-none shadow-xl flex flex-col z-50 animate-in fade-in"
    : "fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] shadow-xl flex flex-col z-50 animate-in fade-in slide-in-from-bottom-10";

  return (
    <div className={chatWindowClasses}>
      <div className="flex items-center justify-between border-b p-3 bg-primary text-white rounded-t-lg">
        <h3 className="font-semibold flex items-center gap-2">
          <div className="bg-white/20 p-1 rounded">
            <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </div>
          Restaurant Assistant
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMaximize}
            className="text-white hover:bg-primary-foreground/10"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-3 space-y-3 bg-background">
        <div className="space-y-2">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Assistant is thinking...</p>
            </div>
          )}
          {isUploading && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading and processing file...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="p-2 bg-background border-t">
        <FileUploadButton 
          fileInputRef={fileInputRef} 
          onFileUpload={onFileUpload} 
          isDisabled={isUploading || isLoading} 
        />
        <ChatInput onSendMessage={onSendMessage} isLoading={isLoading || isUploading} />
      </div>
    </div>
  );
};

export default ChatWindow;
