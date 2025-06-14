
import React from "react";
import { MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SampleQuestionsProps {
  onQuestionClick: (question: string) => void;
}

const SampleQuestions = ({ onQuestionClick }: SampleQuestionsProps) => {
  const sampleQuestions = [
    {
      question: "What were my sales this week compared to last week?",
      icon: "📊",
      category: "Sales"
    },
    {
      question: "Which menu items have the highest profit margin?",
      icon: "🍽️",
      category: "Menu"
    },
    {
      question: "Show me the inventory items below par level",
      icon: "📦",
      category: "Inventory"
    },
    {
      question: "Predict sales for next Saturday",
      icon: "🔮",
      category: "Prediction"
    },
    {
      question: "How many reservations do we have for next week?",
      icon: "📅",
      category: "Reservations"
    },
    {
      question: "What's the status of our current inventory?",
      icon: "📋",
      category: "Status"
    }
  ];

  return (
    <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6 flex-shrink-0">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
          <MessageSquare className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Sample Questions
          </h2>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Try these examples
          </p>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-2">
          {sampleQuestions.map((item, index) => (
            <button
              key={index}
              onClick={() => onQuestionClick(item.question)}
              className="w-full p-4 bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group text-left"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl bg-white/80 backdrop-blur-sm rounded-xl p-2 shadow-md group-hover:shadow-lg transition-all duration-300">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors duration-200 leading-relaxed">
                    {item.question}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SampleQuestions;
