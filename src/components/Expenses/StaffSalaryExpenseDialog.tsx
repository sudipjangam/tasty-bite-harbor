import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import {
  Users,
  Loader2,
  Download,
  UserCheck,
  Briefcase,
  AlertCircle,
} from "lucide-react";

interface StaffSalaryExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface StaffRow {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  salary: number | null;
  salary_type: string | null;
  status: string;
}

const StaffSalaryExpenseDialog: React.FC<StaffSalaryExpenseDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Fetch active staff with salary data
  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ["staff-salary-expense", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("staff")
        .select(
          "id, first_name, last_name, position, salary, salary_type, status",
        )
        .eq("restaurant_id", restaurantId)
        .eq("status", "active")
        .order("first_name");

      if (error) throw error;
      return (data || []) as StaffRow[];
    },
    enabled: !!restaurantId && isOpen,
  });

  // Toggle staff selection
  const toggleStaff = (id: string) => {
    const updated = new Set(selectedStaff);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedStaff(updated);
  };

  // Select all / deselect all
  const toggleAll = () => {
    const staffWithSalary = staffList.filter((s) => s.salary && s.salary > 0);
    if (selectedStaff.size === staffWithSalary.length) {
      setSelectedStaff(new Set());
    } else {
      setSelectedStaff(new Set(staffWithSalary.map((s) => s.id)));
    }
  };

  // Get effective salary (override or original)
  const getEffectiveSalary = (staff: StaffRow): number => {
    if (overrides[staff.id] !== undefined && overrides[staff.id] !== "") {
      return parseFloat(overrides[staff.id]) || 0;
    }
    return staff.salary || 0;
  };

  // Calculate total for selected staff
  const selectedTotal = useMemo(() => {
    return staffList
      .filter((s) => selectedStaff.has(s.id))
      .reduce((sum, s) => sum + getEffectiveSalary(s), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffList, selectedStaff, overrides]);

  // Build description
  const buildDescription = () => {
    const selected = staffList.filter((s) => selectedStaff.has(s.id));
    const month = format(new Date(), "MMMM yyyy");
    const lines = selected.map(
      (s) =>
        `${s.first_name} ${s.last_name} (${s.position}) - ${currencySymbol}${getEffectiveSalary(s).toFixed(2)} (${s.salary_type || "monthly"})`,
    );
    return `Staff salaries for ${month}\n${lines.join("\n")}\nTotal: ${currencySymbol}${selectedTotal.toFixed(2)}`;
  };

  // Import as expense
  const handleImport = async () => {
    if (selectedStaff.size === 0) {
      toast({
        title: "No Staff Selected",
        description: "Please select at least one staff member.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("No restaurant found");

      const { error } = await supabase.from("expenses").insert({
        restaurant_id: profile.restaurant_id,
        category: "staff_salary",
        subcategory: `${format(new Date(), "MMMM yyyy")} Salaries`,
        amount: Math.round(selectedTotal * 100) / 100,
        description: buildDescription(),
        expense_date: format(new Date(), "yyyy-MM-dd"),
        payment_method: "bank_transfer",
        is_recurring: false,
        created_by: session.user.id,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-data"] });

      toast({
        title: "Staff Salaries Imported",
        description: `${currencySymbol}${selectedTotal.toFixed(2)} for ${selectedStaff.size} staff members recorded.`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error importing salary expense:", error);
      toast({
        title: "Import Failed",
        description: "Could not record the salary expense.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const staffWithSalary = staffList.filter((s) => s.salary && s.salary > 0);
  const staffWithoutSalary = staffList.filter(
    (s) => !s.salary || s.salary === 0,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
              <Users className="h-5 w-5 text-white" />
            </div>
            Import Staff Salaries
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fetch all active staff salaries and record as an expense. You can
            override individual amounts.
          </p>
        </DialogHeader>

        {/* Staff List */}
        <div className="flex-1 overflow-y-auto border rounded-xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : staffWithSalary.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No staff with salary data found</p>
              <p className="text-xs text-gray-400 mt-1">
                Please add salary information in Staff Management first.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                <Checkbox
                  checked={
                    selectedStaff.size === staffWithSalary.length &&
                    staffWithSalary.length > 0
                  }
                  onCheckedChange={toggleAll}
                />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">
                  Staff Member
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-center">
                  Type
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-36 text-right">
                  Salary ({currencySymbol})
                </span>
              </div>

              {/* Staff with salary */}
              {staffWithSalary.map((staff) => {
                const isSelected = selectedStaff.has(staff.id);
                const hasOverride =
                  overrides[staff.id] !== undefined &&
                  overrides[staff.id] !== "";
                return (
                  <div
                    key={staff.id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${isSelected ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleStaff(staff.id)}
                    />
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleStaff(staff.id)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {staff.first_name} {staff.last_name}
                        </p>
                        <UserCheck className="h-3 w-3 text-green-500" />
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {staff.position}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="w-28 justify-center text-xs capitalize"
                    >
                      {staff.salary_type || "monthly"}
                    </Badge>
                    <div className="w-36">
                      <Input
                        type="number"
                        step="0.01"
                        value={
                          hasOverride
                            ? overrides[staff.id]
                            : (staff.salary || 0).toString()
                        }
                        onChange={(e) =>
                          setOverrides({
                            ...overrides,
                            [staff.id]: e.target.value,
                          })
                        }
                        className={`text-right text-sm h-8 ${hasOverride ? "border-amber-400 bg-amber-50/50 dark:bg-amber-900/10" : ""}`}
                      />
                      {hasOverride && (
                        <p className="text-[10px] text-amber-500 text-right mt-0.5">
                          Original: {currencySymbol}
                          {staff.salary}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Staff without salary info */}
              {staffWithoutSalary.length > 0 && (
                <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" />
                    <span>
                      {staffWithoutSalary.length} staff member(s) without salary
                      data:{" "}
                      {staffWithoutSalary
                        .map((s) => `${s.first_name} ${s.last_name}`)
                        .join(", ")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            <span>
              {selectedStaff.size} of {staffWithSalary.length} staff selected
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total Salary Expense</p>
            <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {currencySymbol}
              {selectedTotal.toFixed(2)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedStaff.size === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Import as Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffSalaryExpenseDialog;
