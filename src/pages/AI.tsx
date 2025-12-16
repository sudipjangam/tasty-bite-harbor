
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Chatbot from "@/components/Chatbot/Chatbot";
import AiCapabilities from "@/components/AI/AiCapabilities";
import SampleQuestions from "@/components/AI/SampleQuestions";
import { Sparkles, Brain, ChevronDown, ChevronUp, Database, MessageSquare } from "lucide-react";

const AI = () => {
  const { user } = useAuth();
  const [pendingMessage, setPendingMessage] = useState("");
  const [capabilitiesExpanded, setCapabilitiesExpanded] = useState(false);
  const [questionsExpanded, setQuestionsExpanded] = useState(false);

  const handleSampleQuestionClick = (question: string) => {
    // Insert the question into the chat input instead of sending immediately
    setPendingMessage(question);
    // Collapse the sections on mobile to show the chat
    setCapabilitiesExpanded(false);
    setQuestionsExpanded(false);
  };

  const clearPendingMessage = () => {
    setPendingMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950">
      {/* Compact Header */}
      <div className="p-3">
        <div className="mb-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-xl p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                AI Restaurant Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-xs flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-purple-500" />
                Get comprehensive insights across all your restaurant data
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content - Account for bottom nav on mobile (70px) */}
      <div className="px-3 pb-20 lg:pb-3" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-full">
            {/* Left Column - Collapsible on Mobile, Full on Desktop */}
            <div className="lg:col-span-1 lg:h-full lg:overflow-hidden">
              <div className="flex flex-col gap-3 lg:h-full">
                {/* AI Capabilities - Collapsible on Mobile */}
                <div className="lg:h-1/2">
                  {/* Mobile Collapsible Header */}
                  <button
                    onClick={() => setCapabilitiesExpanded(!capabilitiesExpanded)}
                    className="lg:hidden w-full flex items-center justify-between p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                        <Database className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                          AI Capabilities
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Sparkles className="h-2 w-2" />
                          Tap to {capabilitiesExpanded ? 'hide' : 'view'} features
                        </p>
                      </div>
                    </div>
                    {capabilitiesExpanded ? (
                      <ChevronUp className="h-5 w-5 text-purple-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-purple-500" />
                    )}
                  </button>
                  
                  {/* Mobile Expanded Content - with scroll */}
                  <div className={`lg:hidden overflow-hidden transition-all duration-300 ${capabilitiesExpanded ? 'max-h-64 mt-2 overflow-y-auto' : 'max-h-0'}`}>
                    <AiCapabilities />
                  </div>
                  
                  {/* Desktop Always Visible */}
                  <div className="hidden lg:block h-full">
                    <AiCapabilities />
                  </div>
                </div>
                
                {/* Sample Questions - Collapsible on Mobile */}
                <div className="lg:h-1/2">
                  {/* Mobile Collapsible Header */}
                  <button
                    onClick={() => setQuestionsExpanded(!questionsExpanded)}
                    className="lg:hidden w-full flex items-center justify-between p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                          Sample Questions
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Sparkles className="h-2 w-2" />
                          Tap to {questionsExpanded ? 'hide' : 'view'} examples
                        </p>
                      </div>
                    </div>
                    {questionsExpanded ? (
                      <ChevronUp className="h-5 w-5 text-blue-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-blue-500" />
                    )}
                  </button>
                  
                  {/* Mobile Expanded Content - with scroll */}
                  <div className={`lg:hidden overflow-hidden transition-all duration-300 ${questionsExpanded ? 'max-h-64 mt-2 overflow-y-auto' : 'max-h-0'}`}>
                    <SampleQuestions onQuestionClick={handleSampleQuestionClick} />
                  </div>
                  
                  {/* Desktop Always Visible */}
                  <div className="hidden lg:block h-full">
                    <SampleQuestions onQuestionClick={handleSampleQuestionClick} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Chat Interface - Account for mobile bottom nav */}
            <div className="lg:col-span-3 h-[calc(100vh-280px)] lg:h-full overflow-hidden">
              <div className="h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-xl overflow-hidden">
                <Chatbot 
                  initialOpen={true} 
                  fixedPosition={false}
                  pendingMessage={pendingMessage}
                  onClearPendingMessage={clearPendingMessage}
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
