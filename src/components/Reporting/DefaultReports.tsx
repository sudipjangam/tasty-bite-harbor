import React, { useState } from "react";
import { useReportsData, REPORT_CATEGORIES, ReportCategory } from "@/hooks/useReportsData";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingCart, UtensilsCrossed, Package, Users, UserCheck, 
  Truck, Receipt, Bed, ChefHat, Tag, Download, ArrowLeft,
  TrendingUp, AlertCircle
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth } from "date-fns";
import ReportViewer from "./ReportViewer";

const iconMap: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart className="h-6 w-6" />,
  UtensilsCrossed: <UtensilsCrossed className="h-6 w-6" />,
  Package: <Package className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
  UserCheck: <UserCheck className="h-6 w-6" />,
  Truck: <Truck className="h-6 w-6" />,
  Receipt: <Receipt className="h-6 w-6" />,
  Bed: <Bed className="h-6 w-6" />,
  ChefHat: <ChefHat className="h-6 w-6" />,
  Tag: <Tag className="h-6 w-6" />,
};

const DefaultReports: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  
  const { getReportByCategory, isLoadingCategory, isFetchingCategory, getReportError } = useReportsData(dateRange);

  const handleCardClick = (categoryId: ReportCategory) => {
    setSelectedCategory(categoryId);
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  // Show report viewer if category is selected
  if (selectedCategory) {
    const reportData = getReportByCategory(selectedCategory);
    const isLoading = isLoadingCategory(selectedCategory);
    const isFetching = isFetchingCategory(selectedCategory);
    const error = getReportError(selectedCategory);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <StandardizedButton variant="secondary" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </StandardizedButton>
          <h3 className="text-lg font-semibold">
            {REPORT_CATEGORIES.find(c => c.id === selectedCategory)?.name} Report
          </h3>
        </div>
        
        {isLoading || isFetching ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <StandardizedCard className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive font-medium">Error loading report</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </StandardizedCard>
        ) : reportData && reportData.tableData && reportData.tableData.length > 0 ? (
          <ReportViewer reports={[reportData]} dateRange={dateRange} />
        ) : reportData ? (
          <div className="space-y-4">
            {/* Still show the summary even if there's no table data */}
            <StandardizedCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">{reportData.title}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(reportData.summary).map(([key, value]) => (
                  <div key={key} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{key}</p>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center py-8 bg-muted/30 rounded-lg">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No records found for the selected date range</p>
              </div>
            </StandardizedCard>
          </div>
        ) : (
          <StandardizedCard className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No data available for this report</p>
          </StandardizedCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Default Reports
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Click on any category to generate its report
          </p>
        </div>
        <DatePickerWithRange 
          initialDateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {REPORT_CATEGORIES.map((category) => (
          <div
            key={category.id}
            onClick={() => handleCardClick(category.id)}
            className="cursor-pointer transition-all hover:scale-[1.02]"
          >
            <StandardizedCard className="p-4 h-full hover:border-primary/50">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-3 rounded-full ${category.color} text-white`}>
                  {iconMap[category.icon]}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{category.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {category.description}
                  </p>
                </div>
              </div>
            </StandardizedCard>
          </div>
        ))}
      </div>

      <StandardizedCard className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Export Options</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Each report can be exported to PDF or Excel. Click on a category above to generate and export reports.
            </p>
          </div>
        </div>
      </StandardizedCard>
    </div>
  );
};

export default DefaultReports;
