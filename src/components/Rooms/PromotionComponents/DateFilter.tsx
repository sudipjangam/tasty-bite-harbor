
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DateFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
  className?: string;
}

const DateFilter = ({ 
  value, 
  onChange, 
  options, 
  className = "" 
}: DateFilterProps) => {
  return (
    <div className={className}>
      <Tabs value={value} onValueChange={onChange}>
        <TabsList className="grid grid-cols-4 w-full bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
          {options.map((option) => (
            <TabsTrigger 
              key={option.value}
              value={option.value} 
              className="data-[state=active]:bg-primary data-[state=active]:text-white transition-colors"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default DateFilter;
