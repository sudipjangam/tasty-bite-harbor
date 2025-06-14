
import React from "react";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import Chatbot from "@/components/Chatbot/Chatbot";
import AiCapabilities from "@/components/AI/AiCapabilities";
import SampleQuestions from "@/components/AI/SampleQuestions";
import { useChatWithApi } from "@/hooks/useChatWithApi";
import { Sparkles, Brain, MessageSquare } from "lucide-react";

const AI = () => {
  const { user } = useSimpleAuth();
  const { handleSendMessage } = useChatWithApi();

  const handleSampleQuestionClick = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950 overflow-hidden">
      {/* Compact Header */}
      <div className="p-4">
        <div className="mb-4 bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                AI Restaurant Assistant
              </h1>
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Get comprehensive insights across all your restaurant data
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content - Fixed Height */}
      <div className="px-4 pb-4 h-[calc(100vh-7rem)]">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            {/* Left Column - Capabilities and Sample Questions */}
            <div className="lg:col-span-1 flex flex-col gap-4 h-full">
              <div className="flex-1 min-h-0">
                <AiCapabilities />
              </div>
              <div className="flex-1 min-h-0">
                <SampleQuestions onQuestionClick={handleSampleQuestionClick} />
              </div>
            </div>
            
            {/* Right Column - Chat Interface */}
            <div className="lg:col-span-3 h-full">
              <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl overflow-hidden">
                <Chatbot 
                  initialOpen={true} 
                  fixedPosition={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AI;
