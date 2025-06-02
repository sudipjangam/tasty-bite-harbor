
import React from "react";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import Chatbot from "@/components/Chatbot/Chatbot";
import AiCapabilities from "@/components/AI/AiCapabilities";
import SampleQuestions from "@/components/AI/SampleQuestions";
import { useChatWithApi } from "@/hooks/useChatWithApi";

const AI = () => {
  const { user } = useSimpleAuth();
  const { handleSendMessage } = useChatWithApi();

  const handleSampleQuestionClick = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <PageHeader
        title="AI Restaurant Assistant"
        description="Get comprehensive insights across all your restaurant data"
      />
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Capabilities and Sample Questions */}
          <div className="lg:col-span-1 space-y-6">
            <AiCapabilities />
            <SampleQuestions onQuestionClick={handleSampleQuestionClick} />
          </div>
          
          {/* Right Column - Chat Interface */}
          <div className="lg:col-span-2">
            <div className="h-[calc(100vh-12rem)]">
              <Chatbot 
                initialOpen={true} 
                fixedPosition={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AI;
