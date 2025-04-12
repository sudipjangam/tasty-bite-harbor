
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import Chatbot from "@/components/Chatbot/Chatbot";
import { Bot, Brain, ChefHat, LineChart, ShoppingCart } from "lucide-react";

const AI = () => {
  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <Card variant="glass" className="p-4 md:p-6 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          AI Restaurant Assistant
        </h1>
        <p className="text-muted-foreground mt-1">
          Get instant insights and answers about your restaurant data
        </p>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card variant="default" className="p-4 md:p-6 rounded-xl h-full">
            <div className="h-full">
              <Chatbot initialOpen={true} fixedPosition={false} />
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card variant="default" className="p-4 md:p-6 rounded-xl mb-6">
            <div className="flex items-center mb-3">
              <Brain className="h-5 w-5 mr-2 text-purple-500" />
              <h3 className="text-lg font-medium">AI Capabilities</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  <LineChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Sales Analysis</h4>
                  <p className="text-xs text-muted-foreground">Get insights on revenue trends, order patterns, and financial performance</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Inventory Management</h4>
                  <p className="text-xs text-muted-foreground">Check stock levels, get reordering suggestions, and track item usage</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  <ChefHat className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Menu Optimization</h4>
                  <p className="text-xs text-muted-foreground">Analyze menu performance and get suggestions for menu improvements</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Document Analysis</h4>
                  <p className="text-xs text-muted-foreground">Upload files and images for AI-powered analysis and insights</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card variant="default" className="p-4 md:p-6 rounded-xl">
            <h3 className="text-sm font-medium mb-2">Sample Questions</h3>
            <div className="space-y-2">
              {[
                "What were my sales this week compared to last week?",
                "Which menu items have the highest profit margin?",
                "When are my peak business hours?",
                "What inventory items need to be reordered soon?",
                "Can you analyze this sales spreadsheet I uploaded?"
              ].map((question, index) => (
                <div 
                  key={index} 
                  className="text-xs p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  {question}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AI;
