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
import {
  format,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  differenceInDays,
  parseISO,
  isWithinInterval,
  min,
  max,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Loader2,
  Download,
  UserCheck,
  Briefcase,
  AlertCircle,
  CalendarDays,
  CalendarOff,
  Info,
  AlertTriangle,
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

interface LeaveRequest {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
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
  const [monthOffset, setMonthOffset] = useState("0");

  // Calculate target month
  const targetMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - parseInt(monthOffset));
    return d;
  }, [monthOffset]);

  const monthStart = useMemo(() => startOfMonth(targetMonth), [targetMonth]);
  const monthEnd = useMemo(() => endOfMonth(targetMonth), [targetMonth]);
  const totalDaysInMonth = useMemo(
    () => getDaysInMonth(targetMonth),
    [targetMonth],
  );
  const monthLabel = useMemo(
    () => format(targetMonth, "MMMM yyyy"),
    [targetMonth],
  );

  // Fetch active staff with salary data
  const { data: staffList = [], isLoading: staffLoading } = useQuery({
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

  // Fetch approved leave requests for target month
  const { data: leaveRequests = [], isLoading: leavesLoading } = useQuery({
    queryKey: ["staff-leaves-for-salary", restaurantId, monthOffset],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("staff_leave_requests")
        .select("id, staff_id, start_date, end_date, status")
        .eq("restaurant_id", restaurantId)
        .eq("status", "approved")
        .lte("start_date", format(monthEnd, "yyyy-MM-dd"))
        .gte("end_date", format(monthStart, "yyyy-MM-dd"));
      if (error) {
        console.error("Error fetching leave requests:", error);
        return [];
      }
      return (data || []) as LeaveRequest[];
    },
    enabled: !!restaurantId && isOpen,
  });

  const isLoading = staffLoading || leavesLoading;

  // Check for existing salary import for target month
  const { data: existingSalaryImport } = useQuery({
    queryKey: ["salary-duplicate-check", restaurantId, monthOffset],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data } = await supabase
        .from("expenses")
        .select("id, amount, expense_date")
        .eq("restaurant_id", restaurantId)
        .eq("category", "staff_salary")
        .ilike("subcategory", `%${monthLabel}%`)
        .limit(1);
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!restaurantId && isOpen,
  });

  // Calculate leave days for a specific staff member in the target month
  const getApprovedLeaveDays = (staffId: string): number => {
    const staffLeaves = leaveRequests.filter((l) => l.staff_id === staffId);
    let totalLeaveDays = 0;

    for (const leave of staffLeaves) {
      const leaveStart = parseISO(leave.start_date);
      const leaveEnd = parseISO(leave.end_date);

      // Clip leave dates to the target month boundaries
      const effectiveStart = max([leaveStart, monthStart]);
      const effectiveEnd = min([leaveEnd, monthEnd]);

      if (effectiveStart <= effectiveEnd) {
        totalLeaveDays += differenceInDays(effectiveEnd, effectiveStart) + 1;
      }
    }
    return totalLeaveDays;
  };

  // Calculate effective salary based on salary_type and leave days
  const calculateEffectiveSalary = (
    staff: StaffRow,
  ): {
    baseSalary: number;
    leaveDays: number;
    workingDays: number;
    effectiveSalary: number;
    perDayRate: number;
    deduction: number;
  } => {
    const baseSalary = staff.salary || 0;
    const leaveDays = getApprovedLeaveDays(staff.id);
    const workingDays = totalDaysInMonth - leaveDays;
    const salaryType = staff.salary_type || "monthly";

    if (salaryType === "daily") {
      // Daily: salary × working days
      const effectiveSalary = baseSalary * workingDays;
      return {
        baseSalary,
        leaveDays,
        workingDays,
        effectiveSalary,
        perDayRate: baseSalary,
        deduction: baseSalary * leaveDays,
      };
    } else {
      // Monthly: salary - (salary/totalDays × leaveDays)
      const perDayRate = baseSalary / totalDaysInMonth;
      const deduction = perDayRate * leaveDays;
      const effectiveSalary = baseSalary - deduction;
      return {
        baseSalary,
        leaveDays,
        workingDays,
        effectiveSalary,
        perDayRate,
        deduction,
      };
    }
  };

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

  // Get final salary amount (override or calculated)
  const getFinalSalary = (staff: StaffRow): number => {
    if (overrides[staff.id] !== undefined && overrides[staff.id] !== "") {
      return parseFloat(overrides[staff.id]) || 0;
    }
    return (
      Math.round(calculateEffectiveSalary(staff).effectiveSalary * 100) / 100
    );
  };

  // Calculate total for selected staff
  const selectedTotal = useMemo(() => {
    return staffList
      .filter((s) => selectedStaff.has(s.id))
      .reduce((sum, s) => sum + getFinalSalary(s), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffList, selectedStaff, overrides, leaveRequests, monthOffset]);

  // Build description
  const buildDescription = () => {
    const selected = staffList.filter((s) => selectedStaff.has(s.id));
    const lines = selected.map((s) => {
      const calc = calculateEffectiveSalary(s);
      const finalAmount = getFinalSalary(s);
      const hasOverride =
        overrides[s.id] !== undefined && overrides[s.id] !== "";
      const salaryType = s.salary_type || "monthly";

      if (salaryType === "daily") {
        return `${s.first_name} ${s.last_name} (${s.position}) - ${currencySymbol}${s.salary}/day × ${calc.workingDays} days (${calc.leaveDays} leave) = ${currencySymbol}${finalAmount.toFixed(2)}${hasOverride ? " [overridden]" : ""}`;
      } else {
        return `${s.first_name} ${s.last_name} (${s.position}) - ${currencySymbol}${s.salary}/month - ${calc.leaveDays} days leave (${currencySymbol}${calc.deduction.toFixed(2)} deducted) = ${currencySymbol}${finalAmount.toFixed(2)}${hasOverride ? " [overridden]" : ""}`;
      }
    });
    return `Staff salaries for ${monthLabel}\n${lines.join("\n")}\nTotal: ${currencySymbol}${selectedTotal.toFixed(2)}`;
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
        subcategory: `${monthLabel} Salaries`,
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
        description: `${currencySymbol}${selectedTotal.toFixed(2)} for ${selectedStaff.size} staff members (${monthLabel})`,
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
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
              <Users className="h-5 w-5 text-white" />
            </div>
            Import Staff Salaries
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Salary auto-calculated based on attendance & approved leaves.
          </p>
        </DialogHeader>

        {/* Month Selector + Info */}
        <div className="flex items-center gap-3 px-1 flex-wrap">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <Select value={monthOffset} onValueChange={setMonthOffset}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Current Month</SelectItem>
              <SelectItem value="1">Last Month</SelectItem>
              <SelectItem value="2">2 Months Ago</SelectItem>
              <SelectItem value="3">3 Months Ago</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {monthLabel} • {totalDaysInMonth} days
          </Badge>
        </div>

        {/* Salary Calculation Info */}
        <div className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800/30">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>
            <strong>Daily staff:</strong> Salary/day × working days
            &nbsp;|&nbsp;
            <strong>Monthly staff:</strong> Monthly salary − (salary ÷{" "}
            {totalDaysInMonth} × leave days)
          </div>
        </div>

        {/* Duplicate Warning */}
        {existingSalaryImport && (
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/30">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              A salary expense of{" "}
              <strong>
                {currencySymbol}
                {existingSalaryImport.amount}
              </strong>{" "}
              was already imported for {monthLabel} on{" "}
              {format(new Date(existingSalaryImport.expense_date), "MMM d")}.
              Importing again will create a duplicate.
            </span>
          </div>
        )}

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
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
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
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 text-center">
                  Type
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 text-center">
                  Leave
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 text-center">
                  Days
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-36 text-right">
                  Payable ({currencySymbol})
                </span>
              </div>

              {/* Staff rows */}
              {staffWithSalary.map((staff) => {
                const isSelected = selectedStaff.has(staff.id);
                const calc = calculateEffectiveSalary(staff);
                const hasOverride =
                  overrides[staff.id] !== undefined &&
                  overrides[staff.id] !== "";
                const finalAmount = getFinalSalary(staff);
                const salaryType = staff.salary_type || "monthly";

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
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {staff.position}
                        </p>
                        <span className="text-xs text-gray-300">•</span>
                        <p className="text-xs text-gray-400">
                          {salaryType === "daily"
                            ? `${currencySymbol}${staff.salary}/day`
                            : `${currencySymbol}${staff.salary}/month`}
                        </p>
                      </div>
                    </div>

                    {/* Type */}
                    <Badge
                      variant="outline"
                      className="w-20 justify-center text-xs capitalize"
                    >
                      {salaryType}
                    </Badge>

                    {/* Leave days */}
                    <div className="w-16 text-center">
                      {calc.leaveDays > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          <CalendarOff className="h-3 w-3 mr-0.5" />
                          {calc.leaveDays}
                        </Badge>
                      ) : (
                        <span className="text-xs text-green-500">0</span>
                      )}
                    </div>

                    {/* Working days */}
                    <div className="w-16 text-center text-sm text-gray-600 dark:text-gray-300">
                      {calc.workingDays}
                    </div>

                    {/* Payable amount */}
                    <div className="w-36">
                      <Input
                        type="number"
                        step="0.01"
                        value={
                          hasOverride
                            ? overrides[staff.id]
                            : finalAmount.toFixed(2)
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
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <p className="text-[10px] text-amber-500">
                            Auto: {currencySymbol}
                            {calc.effectiveSalary.toFixed(2)}
                          </p>
                          <button
                            type="button"
                            className="text-[10px] text-blue-500 hover:underline"
                            onClick={() => {
                              const updated = { ...overrides };
                              delete updated[staff.id];
                              setOverrides(updated);
                            }}
                          >
                            Reset
                          </button>
                        </div>
                      )}
                      {!hasOverride && calc.leaveDays > 0 && (
                        <p className="text-[10px] text-red-400 text-right mt-0.5">
                          -{currencySymbol}
                          {calc.deduction.toFixed(2)} deducted
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
                      {staffWithoutSalary.length} staff without salary data:{" "}
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
            <p className="text-xs text-gray-400">
              Total Salary Expense ({monthLabel})
            </p>
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
