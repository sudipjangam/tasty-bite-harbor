
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import Chatbot from "@/components/Chatbot/Chatbot";
import AiCapabilities from "@/components/AI/AiCapabilities";
import SampleQuestions from "@/components/AI/SampleQuestions";
import { useChatWithApi } from "@/hooks/useChatWithApi";
import { Sparkles, Brain, MessageSquare } from "lucide-react";

const AI = () => {
  const { user } = useAuth();
  const { handleSendMessage } = useChatWithApi();

  const handleSampleQuestionClick = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950">
      {/* Compact Header */}
      <div className="p-3">
        <div className="mb-3 bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                AI Restaurant Assistant
              </h1>
              <p className="text-gray-600 text-xs flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-purple-500" />
                Get comprehensive insights across all your restaurant data
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content - Full Height with Proper Scrolling */}
      <div className="px-3 pb-3" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-full">
            {/* Left Column - Capabilities and Sample Questions with Scrolling */}
            <div className="lg:col-span-1 h-full overflow-hidden">
              <div className="h-full flex flex-col gap-3">
                {/* AI Capabilities - Fixed Height */}
                <div className="h-1/2">
                  <AiCapabilities />
                </div>
                
                {/* Sample Questions - Fixed Height */}
                <div className="h-1/2">
                  <SampleQuestions onQuestionClick={handleSampleQuestionClick} />
                </div>
              </div>
            </div>
            
            {/* Right Column - Chat Interface with Limited Height */}
            <div className="lg:col-span-3 h-full overflow-auto">
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
