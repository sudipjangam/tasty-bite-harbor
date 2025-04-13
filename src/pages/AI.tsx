
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import Chatbot from "@/components/Chatbot/Chatbot";
import { Bot, Brain, ChefHat, Database, LineChart, ShoppingCart, Users, MessageCircleQuestion } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const AI = () => {
  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <Card variant="glass" className="p-4 md:p-6 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          AI Restaurant Assistant
        </h1>
        <p className="text-muted-foreground mt-1">
          Get comprehensive insights across all your restaurant data
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
        
        <div className="lg:col-span-1 space-y-6">
          <Card variant="default" className="p-4 md:p-6 rounded-xl">
            <h3 className="text-lg font-medium flex items-center mb-4">
              <Brain className="h-5 w-5 mr-2 text-primary" />
              AI Capabilities
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="capability-card border border-gray-200 rounded-lg p-3 hover:border-primary cursor-pointer">
                <div className="flex items-center mb-1">
                  <LineChart className="h-4 w-4 mr-2 text-primary" />
                  <h4 className="font-semibold text-sm">Sales Analysis</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Analyze revenue trends, order patterns, and financial performance.
                </p>
              </div>
              
              <div className="capability-card border border-gray-200 rounded-lg p-3 hover:border-primary cursor-pointer">
                <div className="flex items-center mb-1">
                  <ShoppingCart className="h-4 w-4 mr-2 text-purple-500" />
                  <h4 className="font-semibold text-sm">Inventory Insights</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Check stock levels, get reorder suggestions, and track usage.
                </p>
              </div>
              
              <div className="capability-card border border-gray-200 rounded-lg p-3 hover:border-primary cursor-pointer">
                <div className="flex items-center mb-1">
                  <ChefHat className="h-4 w-4 mr-2 text-amber-500" />
                  <h4 className="font-semibold text-sm">Menu Optimization</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Analyze menu performance and get suggestions for improvements.
                </p>
              </div>
              
              <div className="capability-card border border-gray-200 rounded-lg p-3 hover:border-primary cursor-pointer">
                <div className="flex items-center mb-1">
                  <Users className="h-4 w-4 mr-2 text-red-500" />
                  <h4 className="font-semibold text-sm">Staff Performance</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Analyze staff efficiency, sales per server, and scheduling effectiveness.
                </p>
              </div>
              
              <div className="sm:col-span-2 border border-gray-200 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center mb-1">
                  <Database className="h-4 w-4 mr-2 text-gray-500" />
                  <h4 className="font-semibold text-sm">Comprehensive Data Access</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Analyzes Orders, Inventory, Revenue, Menu Items, Staff, Customers, Suppliers, Reservations & more.
                </p>
              </div>
            </div>
          </Card>
          
          <Card variant="default" className="p-4 md:p-6 rounded-xl">
            <h3 className="text-lg font-medium flex items-center mb-4">
              <MessageCircleQuestion className="h-5 w-5 mr-2 text-primary" />
              Sample Questions
            </h3>
            
            <ScrollArea className="h-[240px] pr-4">
              <div className="space-y-2">
                {[
                  "What were my sales this week compared to last week?",
                  "Which menu items have the highest profit margin?",
                  "Show me the inventory items below par level.",
                  "Predict sales for next Saturday.",
                  "How many reservations do we have for next week?",
                  "What's the status of our current inventory?",
                  "How many staff members are on leave this month?",
                  "What are our busiest dining tables?",
                  "Analyze our customer spending patterns",
                  "When are our peak business hours?",
                  "List our top 5 customers by total spending",
                  "What supplier orders are pending delivery?"
                ].map((question, index) => (
                  <button 
                    key={index} 
                    className="sample-question-btn w-full text-left text-sm p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/40 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
                    onClick={() => {
                      const chatInput = document.querySelector('input[placeholder*="Ask"]') as HTMLInputElement;
                      if (chatInput) {
                        chatInput.value = question;
                        // Trigger an input event to update React's state
                        const inputEvent = new Event('input', { bubbles: true });
                        chatInput.dispatchEvent(inputEvent);
                        
                        // Set focus to the input
                        chatInput.focus();
                        
                        // Trigger the send button click
                        const sendButton = chatInput.closest('form')?.querySelector('button[type="submit"]') as HTMLButtonElement;
                        if (sendButton) {
                          setTimeout(() => {
                            sendButton.click();
                          }, 50);
                        }
                      }
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AI;
