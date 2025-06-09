
import React from "react";
import { MessageSquare } from "lucide-react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";

interface SampleQuestionsProps {
  onQuestionClick: (question: string) => void;
}

const SampleQuestions = ({ onQuestionClick }: SampleQuestionsProps) => {
  const sampleQuestions = [
    "What were my sales this week compared to last week?",
    "Which menu items have the highest profit margin?",
    "Show me the inventory items below par level",
    "Predict sales for next Saturday",
    "How many reservations do we have for next week?",
    "What's the status of our current inventory?"
  ];

  return (
    <StandardizedCard className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
          <MessageSquare className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Sample Questions
        </h2>
      </div>
      <div className="space-y-2">
        {sampleQuestions.map((question, index) => (
          <StandardizedButton
            key={index}
            variant="secondary"
            size="sm"
            onClick={() => onQuestionClick(question)}
            className="w-full text-left justify-start h-auto p-3 whitespace-normal text-wrap hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-sm"
          >
            {question}
          </StandardizedButton>
        ))}
      </div>
    </StandardizedCard>
  );
};

export default SampleQuestions;
