
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import Chatbot from "@/components/Chatbot/Chatbot";
import { Bot, Brain, ChefHat, Database, LineChart, ShoppingCart, Users, MessageCircleQuestion, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const AI = () => {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6">
        <Card variant="glass" className="p-4 md:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-white/20">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-3 rounded-full">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                AI Restaurant Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Get comprehensive insights across all your restaurant data
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 pb-6 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Chat Section */}
          <div className="lg:col-span-2 h-full">
            <Card variant="default" className="p-0 rounded-xl h-full overflow-hidden shadow-xl bg-white dark:bg-gray-800">
              <div className="h-full">
                <Chatbot initialOpen={true} fixedPosition={false} />
              </div>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-6 h-full">
            {/* AI Capabilities */}
            <Card variant="default" className="p-4 md:p-6 rounded-xl flex-1 bg-white dark:bg-gray-800 shadow-lg">
              <h3 className="text-lg font-semibold flex items-center mb-4 text-gray-800 dark:text-gray-200">
                <Brain className="h-5 w-5 mr-2 text-purple-600" />
                AI Capabilities
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="capability-card border border-purple-100 dark:border-purple-800 rounded-lg p-3 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/20">
                  <div className="flex items-center mb-2">
                    <LineChart className="h-4 w-4 mr-2 text-purple-600" />
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Sales Analysis</h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Analyze revenue trends, order patterns, and financial performance.
                  </p>
                </div>
                
                <div className="capability-card border border-purple-100 dark:border-purple-800 rounded-lg p-3 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/20">
                  <div className="flex items-center mb-2">
                    <ShoppingCart className="h-4 w-4 mr-2 text-purple-600" />
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Inventory Insights</h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Check stock levels, get reorder suggestions, and track usage.
                  </p>
                </div>
                
                <div className="capability-card border border-purple-100 dark:border-purple-800 rounded-lg p-3 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/20">
                  <div className="flex items-center mb-2">
                    <ChefHat className="h-4 w-4 mr-2 text-purple-600" />
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Menu Optimization</h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Analyze menu performance and get suggestions for improvements.
                  </p>
                </div>
                
                <div className="capability-card border border-purple-100 dark:border-purple-800 rounded-lg p-3 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/20">
                  <div className="flex items-center mb-2">
                    <Users className="h-4 w-4 mr-2 text-purple-600" />
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Staff Performance</h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Analyze staff efficiency, sales per server, and scheduling effectiveness.
                  </p>
                </div>
                
                <div className="border border-purple-100 dark:border-purple-800 rounded-lg p-3 bg-gradient-to-r from-purple-100/50 to-purple-50/50 dark:from-purple-900/30 dark:to-purple-800/30">
                  <div className="flex items-center mb-2">
                    <Database className="h-4 w-4 mr-2 text-purple-600" />
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Comprehensive Data Access</h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Analyzes Orders, Inventory, Revenue, Menu Items, Staff, Customers, Suppliers, Reservations & more.
                  </p>
                </div>
              </div>
            </Card>
            
            {/* Sample Questions */}
            <Card variant="default" className="p-4 md:p-6 rounded-xl flex-1 bg-white dark:bg-gray-800 shadow-lg">
              <h3 className="text-lg font-semibold flex items-center mb-4 text-gray-800 dark:text-gray-200">
                <MessageCircleQuestion className="h-5 w-5 mr-2 text-purple-600" />
                Sample Questions
              </h3>
              
              <ScrollArea className="h-[280px] pr-2">
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
                      className="sample-question-btn w-full text-left text-sm p-3 rounded-lg bg-gradient-to-r from-purple-50 to-purple-25 dark:from-purple-900/20 dark:to-purple-800/20 text-purple-700 dark:text-purple-300 hover:from-purple-100 hover:to-purple-50 dark:hover:from-purple-800/30 dark:hover:to-purple-700/30 hover:text-purple-800 dark:hover:text-purple-200 transition-all duration-200 border border-purple-100 dark:border-purple-800 hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-sm"
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
    </div>
  );
};

export default AI;
