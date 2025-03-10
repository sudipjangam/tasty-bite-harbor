
import React, { useRef, useEffect } from "react";
import { Loader2, Minimize2, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import FileUploadButton from "./FileUploadButton";

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
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const chatWindowClasses = isMaximized 
    ? "fixed inset-4 md:inset-10 h-auto w-auto max-w-none shadow-xl flex flex-col z-50 animate-in fade-in"
    : "fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] shadow-xl flex flex-col z-50 animate-in fade-in slide-in-from-bottom-10";

  return (
    <div className={chatWindowClasses}>
      <div className="flex items-center justify-between border-b p-3 bg-purple-600 text-white rounded-t-lg">
        <h3 className="font-semibold">Restaurant Assistant</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMaximize}
            className="text-white hover:bg-purple-700"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-purple-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Assistant is thinking...</p>
          </div>
        )}
        {isUploading && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading and processing file...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-2 bg-background">
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
