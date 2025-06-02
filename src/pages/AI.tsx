
import React from "react";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import Chatbot from "@/components/Chatbot/Chatbot";

const AI = () => {
  const { user } = useSimpleAuth();

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <PageHeader
        title="AI Assistant"
        description="Get intelligent insights and assistance for your restaurant operations"
      />
      
      <div className="max-w-4xl mx-auto">
        <Chatbot />
      </div>
    </div>
  );
};

export default AI;
