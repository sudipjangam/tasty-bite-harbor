
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950">
      {/* Modern Header with Glass Effect */}
      <div className="p-6">
        <div className="mb-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                AI Restaurant Assistant
              </h1>
              <p className="text-gray-600 text-lg mt-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Get comprehensive insights across all your restaurant data
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-12rem)]">
            {/* Left Column - Capabilities and Sample Questions */}
            <div className="lg:col-span-1 space-y-6">
              <div className="h-1/2 min-h-[300px]">
                <AiCapabilities />
              </div>
              <div className="h-1/2 min-h-[300px]">
                <SampleQuestions onQuestionClick={handleSampleQuestionClick} />
              </div>
            </div>
            
            {/* Right Column - Chat Interface */}
            <div className="lg:col-span-3 min-h-[600px]">
              <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl overflow-hidden">
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
