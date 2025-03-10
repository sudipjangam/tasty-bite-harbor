
import React, { useState, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ChatWindow from "./ChatWindow";
import { useChatWithApi } from "@/hooks/useChatWithApi";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    isLoading,
    isUploading,
    handleSendMessage,
    handleFileUpload,
  } = useChatWithApi();

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
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
        <Card>
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            isUploading={isUploading}
            isMaximized={isMaximized}
            onSendMessage={handleSendMessage}
            onClose={() => setIsOpen(false)}
            onToggleMaximize={toggleMaximize}
            onFileUpload={handleFileUpload}
            fileInputRef={fileInputRef}
          />
        </Card>
      )}
    </>
  );
};

export default Chatbot;
