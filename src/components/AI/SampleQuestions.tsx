
import React from "react";
import { MessageSquare, Sparkles, ArrowRight } from "lucide-react";

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
    <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-lg">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Sample Questions
          </h2>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Try these examples
          </p>
        </div>
      </div>
      
      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {sampleQuestions.map((item, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(item.question)}
            className="w-full p-3 bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group text-left"
          >
            <div className="flex items-start gap-2">
              <div className="text-lg bg-white/80 backdrop-blur-sm rounded-lg p-1.5 shadow-md group-hover:shadow-lg transition-all duration-300">
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-900 group-hover:text-blue-700 transition-colors duration-200 leading-relaxed">
                  {item.question}
                </p>
              </div>
              <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SampleQuestions;
