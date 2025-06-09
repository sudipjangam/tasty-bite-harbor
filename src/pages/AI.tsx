
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-4 md:p-6">
        <PageHeader
          title="AI Restaurant Assistant"
          description="Get comprehensive insights across all your restaurant data"
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 px-4 md:px-6 pb-6 min-h-0">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Left Column - Capabilities and Sample Questions (Fixed Height, No Scroll) */}
            <div className="lg:col-span-1 space-y-6 overflow-hidden">
              <div className="h-1/2">
                <AiCapabilities />
              </div>
              <div className="h-1/2">
                <SampleQuestions onQuestionClick={handleSampleQuestionClick} />
              </div>
            </div>
            
            {/* Right Column - Chat Interface (Full Height with Internal Scroll) */}
            <div className="lg:col-span-3 h-full">
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
