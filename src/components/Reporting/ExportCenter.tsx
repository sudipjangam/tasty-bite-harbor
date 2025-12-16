import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download, Database, FileSpreadsheet, FileText, 
  Loader2, Check, AlertCircle
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ExportableTable {
  id: string;
  name: string;
  description: string;
  tableName: string;
}

const EXPORTABLE_TABLES: ExportableTable[] = [
  { id: 'orders', name: 'Orders', description: 'All order transactions', tableName: 'orders' },
  { id: 'menu_items', name: 'Menu Items', description: 'Menu catalog', tableName: 'menu_items' },
  { id: 'inventory_items', name: 'Inventory', description: 'Stock levels', tableName: 'inventory_items' },
  { id: 'customers', name: 'Customers', description: 'Customer records', tableName: 'customers' },
  { id: 'staff', name: 'Staff', description: 'Employee records', tableName: 'staff' },
  { id: 'expenses', name: 'Expenses', description: 'Expense transactions', tableName: 'expenses' },
  { id: 'suppliers', name: 'Suppliers', description: 'Supplier directory', tableName: 'suppliers' },
  { id: 'reservations', name: 'Reservations', description: 'Booking records', tableName: 'reservations' },
  { id: 'rooms', name: 'Rooms', description: 'Room inventory', tableName: 'rooms' },
  { id: 'recipes', name: 'Recipes', description: 'Recipe catalog', tableName: 'recipes' },
];

const ExportCenter: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [exportingTable, setExportingTable] = useState<string | null>(null);
  const [exportedTables, setExportedTables] = useState<string[]>([]);
  
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();

  const handleExport = async (table: ExportableTable, exportFormat: 'csv' | 'excel') => {
    if (!restaurantId) {
      toast({ title: "No restaurant selected", variant: "destructive" });
      return;
    }

    setExportingTable(table.id);
    
    try {
      // Build query
      let query = supabase.from(table.tableName).select('*').eq('restaurant_id', restaurantId);
      
      // Add date filter for tables with created_at
      if (['orders', 'expenses', 'reservations'].includes(table.id) && dateRange?.from && dateRange?.to) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: "No data to export", description: `No ${table.name} records found` });
        setExportingTable(null);
        return;
      }

      const fileName = `${table.name}_${format(new Date(), 'yyyy-MM-dd')}`;

      if (exportFormat === 'csv') {
        // Convert to CSV
        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => 
            headers.map(h => {
              const val = (row as Record<string, unknown>)[h];
              if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
              if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
              return val ?? '';
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.csv`;
        link.click();
      } else {
        // Convert to Excel
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, table.name);
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }

      setExportedTables(prev => [...prev.filter(t => t !== table.id), table.id]);
      toast({ title: "Export successful", description: `${table.name} exported as ${exportFormat.toUpperCase()}` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExportingTable(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Export Center
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Export raw data from any table in CSV or Excel format
        </p>
      </div>

      {/* Date Range Filter */}
      <StandardizedCard className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div>
            <p className="text-sm font-medium">Date Range Filter</p>
            <p className="text-xs text-muted-foreground">Applied to Orders, Expenses, and Reservations</p>
          </div>
          <DatePickerWithRange 
            initialDateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
      </StandardizedCard>

      {/* Export Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORTABLE_TABLES.map((table) => {
          const isExporting = exportingTable === table.id;
          const wasExported = exportedTables.includes(table.id);
          
          return (
            <StandardizedCard key={table.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    {table.name}
                    {wasExported && <Check className="h-4 w-4 text-green-500" />}
                  </h4>
                  <p className="text-xs text-muted-foreground">{table.description}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <StandardizedButton 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleExport(table, 'csv')}
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <FileText className="h-3 w-3 mr-1" />
                  )}
                  CSV
                </StandardizedButton>
                <StandardizedButton 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleExport(table, 'excel')}
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                  )}
                  Excel
                </StandardizedButton>
              </div>
            </StandardizedCard>
          );
        })}
      </div>

      {/* Info card */}
      <StandardizedCard className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Export Notes</h4>
            <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside space-y-1">
              <li>CSV files can be opened in any spreadsheet application</li>
              <li>Excel files preserve data types and formatting</li>
              <li>Date range filter only applies to time-based tables</li>
              <li>Large exports may take a few seconds to process</li>
            </ul>
          </div>
        </div>
      </StandardizedCard>
    </div>
  );
};

export default ExportCenter;
