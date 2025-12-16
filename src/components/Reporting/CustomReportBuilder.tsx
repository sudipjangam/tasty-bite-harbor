import React, { useState } from "react";
import { useReportsData, REPORT_CATEGORIES, ReportCategory, ReportData } from "@/hooks/useReportsData";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingCart, UtensilsCrossed, Package, Users, UserCheck, 
  Truck, Receipt, Bed, ChefHat, Tag, FileText, Loader2, Check
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth } from "date-fns";
import ReportViewer from "./ReportViewer";

const iconMap: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart className="h-5 w-5" />,
  UtensilsCrossed: <UtensilsCrossed className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  UserCheck: <UserCheck className="h-5 w-5" />,
  Truck: <Truck className="h-5 w-5" />,
  Receipt: <Receipt className="h-5 w-5" />,
  Bed: <Bed className="h-5 w-5" />,
  ChefHat: <ChefHat className="h-5 w-5" />,
  Tag: <Tag className="h-5 w-5" />,
};

const CustomReportBuilder: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedCategories, setSelectedCategories] = useState<ReportCategory[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<ReportData[] | null>(null);

  const { getReportByCategory, isLoadingCategory } = useReportsData(dateRange);

  const toggleCategory = (categoryId: ReportCategory) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
    // Reset generated reports when selection changes
    setGeneratedReports(null);
  };

  const selectAll = () => {
    setSelectedCategories(REPORT_CATEGORIES.map(c => c.id));
    setGeneratedReports(null);
  };

  const clearAll = () => {
    setSelectedCategories([]);
    setGeneratedReports(null);
  };

  const handleGenerateReport = async () => {
    if (selectedCategories.length === 0) return;
    
    setIsGenerating(true);
    
    // Wait a bit for queries to complete, then collect reports
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const reports: ReportData[] = [];
    for (const catId of selectedCategories) {
      const report = getReportByCategory(catId);
      if (report) {
        reports.push(report);
      }
    }
    
    setGeneratedReports(reports);
    setIsGenerating(false);
  };

  const isAnyLoading = selectedCategories.some(cat => isLoadingCategory(cat));

  // Show generated report
  if (generatedReports) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Custom Report ({generatedReports.length} sections)
          </h3>
          <StandardizedButton variant="secondary" onClick={() => setGeneratedReports(null)}>
            Build New Report
          </StandardizedButton>
        </div>
        
        {generatedReports.length > 0 ? (
          <ReportViewer reports={generatedReports} dateRange={dateRange} />
        ) : (
          <StandardizedCard className="p-8 text-center">
            <p className="text-muted-foreground">No data available for selected categories</p>
          </StandardizedCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Custom Report Builder
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select the categories you want to include in your report
        </p>
      </div>

      {/* Step 1: Date Range */}
      <StandardizedCard className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">1</span>
            <span className="font-medium">Select Date Range</span>
          </div>
          <DatePickerWithRange 
            initialDateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
      </StandardizedCard>

      {/* Step 2: Category Selection */}
      <StandardizedCard className="p-4">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">2</span>
              <span className="font-medium">Select Categories</span>
              <span className="text-sm text-muted-foreground">({selectedCategories.length} selected)</span>
            </div>
            <div className="flex gap-2">
              <StandardizedButton variant="secondary" size="sm" onClick={selectAll}>
                Select All
              </StandardizedButton>
              <StandardizedButton variant="secondary" size="sm" onClick={clearAll}>
                Clear All
              </StandardizedButton>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {REPORT_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <div
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                  `}
                >
                  <Checkbox 
                    checked={isSelected} 
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <div className={`p-2 rounded-full ${category.color} text-white`}>
                    {iconMap[category.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{category.name}</p>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </StandardizedCard>

      {/* Step 3: Generate */}
      <StandardizedCard className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">3</span>
            <span className="font-medium">Generate Report</span>
          </div>
          <StandardizedButton 
            onClick={handleGenerateReport}
            disabled={selectedCategories.length === 0 || isGenerating || isAnyLoading}
            className="min-w-[150px]"
          >
            {isGenerating || isAnyLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </StandardizedButton>
        </div>
        {selectedCategories.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2 ml-8">
            Please select at least one category to generate a report
          </p>
        )}
      </StandardizedCard>
    </div>
  );
};

export default CustomReportBuilder;
