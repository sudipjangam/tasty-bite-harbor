
import { Suspense, lazy } from "react";
import { Card } from "@/components/ui/card";
import Chatbot from "@/components/Chatbot/Chatbot";

const AI = () => {
  return (
    <div className="p-6 animate-fade-in">
      <Card variant="glass" className="p-6 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          AI Assistant
        </h1>
        <p className="text-muted-foreground mt-1">
          Ask any question about your restaurant data and get instant insights
        </p>
      </Card>
      
      <Card variant="default" className="p-6 rounded-xl">
        <div className="flex flex-col space-y-4">
          <div className="text-lg font-medium">
            Your AI Restaurant Assistant
          </div>
          <p className="text-muted-foreground">
            Your AI assistant has access to your restaurant data and can answer questions about:
          </p>
          
          <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
            <li>Sales trends and revenue analysis</li>
            <li>Inventory status and order recommendations</li>
            <li>Customer behavior and preferences</li>
            <li>Menu performance and optimization</li>
            <li>Staff scheduling and management</li>
            <li>And more! Just ask any question about your restaurant.</li>
          </ul>
          
          <div className="h-full min-h-[500px] w-full">
            <Chatbot initialOpen={true} fixedPosition={false} />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AI;
