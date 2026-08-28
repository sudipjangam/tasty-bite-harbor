import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DateFilterProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

const DateFilter = ({ value, onChange, compact = false }: DateFilterProps) => {
  if (compact) {
    return (
      <Tabs value={value} onValueChange={onChange} className="inline-block">
        <TabsList className="h-8 p-0.5 bg-gray-100 dark:bg-gray-700/80 rounded-xl border border-gray-200 dark:border-gray-600 gap-0.5">
          <TabsTrigger 
            value="today" 
            className="h-7 px-2.5 text-xs rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all"
          >
            Today
          </TabsTrigger>
          <TabsTrigger 
            value="yesterday"
            className="h-7 px-2.5 text-xs rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all"
          >
            Yesterday
          </TabsTrigger>
          <TabsTrigger 
            value="last7days"
            className="h-7 px-2.5 text-xs rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all"
          >
            7 Days
          </TabsTrigger>
          <TabsTrigger 
            value="thisMonth"
            className="h-7 px-2.5 text-xs rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all"
          >
            Month
          </TabsTrigger>
          <TabsTrigger 
            value="all"
            className="h-7 px-2.5 text-xs rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all"
          >
            All
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );
  }

  return (
    <div className="mb-4">
      <Tabs value={value} onValueChange={onChange} className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-lg bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
          <TabsTrigger 
            value="today" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-200 dark:text-gray-300 dark:data-[state=active]:text-white"
          >
            Today
          </TabsTrigger>
          <TabsTrigger 
            value="yesterday"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-200 dark:text-gray-300 dark:data-[state=active]:text-white"
          >
            Yesterday
          </TabsTrigger>
          <TabsTrigger 
            value="last7days"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-200 dark:text-gray-300 dark:data-[state=active]:text-white"
          >
            7 Days
          </TabsTrigger>
          <TabsTrigger 
            value="thisMonth"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-200 dark:text-gray-300 dark:data-[state=active]:text-white"
          >
            Month
          </TabsTrigger>
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-200 dark:text-gray-300 dark:data-[state=active]:text-white"
          >
            All
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default DateFilter;
