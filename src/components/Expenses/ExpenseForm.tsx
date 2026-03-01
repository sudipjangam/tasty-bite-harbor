import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Tag, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface EditExpense {
  id: string;
  category: string;
  subcategory: string | null;
  amount: number;
  description: string | null;
  expense_date: string;
  payment_method: string;
  vendor_name: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
}

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editExpense?: EditExpense | null;
}

const SYSTEM_CATEGORIES = [
  { value: "groceries", label: "Groceries & Ingredients", isSystem: true },
  { value: "ingredients", label: "Raw Ingredients", isSystem: true },
  { value: "staff_salary", label: "Staff Salaries", isSystem: true },
  { value: "utilities", label: "Utilities", isSystem: true },
  { value: "rent", label: "Rent & Property", isSystem: true },
  { value: "equipment", label: "Equipment & Supplies", isSystem: true },
  { value: "marketing", label: "Marketing & Advertising", isSystem: true },
  { value: "maintenance", label: "Maintenance & Repairs", isSystem: true },
  { value: "transport", label: "Transport & Fuel", isSystem: true },
  { value: "insurance", label: "Insurance", isSystem: true },
  { value: "license", label: "Licenses & Permits", isSystem: true },
  { value: "other", label: "Other Expenses", isSystem: true },
];

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editExpense,
}) => {
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [formData, setFormData] = useState({
    category: "",
    subcategory: "",
    amount: "",
    description: "",
    payment_method: "cash",
    vendor_name: "",
    is_recurring: false,
    recurring_frequency: "",
  });

  // Fetch custom categories from DB
  const { data: customCategories = [] } = useQuery({
    queryKey: ["expense-categories", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("expense_categories" as any)
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");
      if (error) {
        console.log(
          "expense_categories table may not exist yet:",
          error.message,
        );
        return [];
      }
      return (data || []).map((c: any) => ({
        value: c.slug || c.name.toLowerCase().replace(/\s+/g, "_"),
        label: c.name,
        description: c.description,
        isSystem: false,
      }));
    },
    enabled: !!restaurantId && isOpen,
  });

  // Merge system + custom categories
  const allCategories = [...SYSTEM_CATEGORIES, ...customCategories];

  // Pre-fill form when editing
  useEffect(() => {
    if (editExpense) {
      setFormData({
        category: editExpense.category || "",
        subcategory: editExpense.subcategory || "",
        amount: editExpense.amount?.toString() || "",
        description: editExpense.description || "",
        payment_method: editExpense.payment_method || "cash",
        vendor_name: editExpense.vendor_name || "",
        is_recurring: editExpense.is_recurring || false,
        recurring_frequency: editExpense.recurring_frequency || "",
      });
      setExpenseDate(
        editExpense.expense_date
          ? parseISO(editExpense.expense_date)
          : new Date(),
      );
    } else {
      setFormData({
        category: "",
        subcategory: "",
        amount: "",
        description: "",
        payment_method: "cash",
        vendor_name: "",
        is_recurring: false,
        recurring_frequency: "",
      });
      setExpenseDate(new Date());
    }
    setShowNewCategory(false);
    setNewCategoryName("");
    setNewCategoryDesc("");
  }, [editExpense, isOpen]);

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cheque", label: "Cheque" },
    { value: "upi", label: "UPI" },
  ];

  const recurringFrequencies = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
  ];

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !restaurantId) return;

    setSavingCategory(true);
    try {
      const slug = newCategoryName.trim().toLowerCase().replace(/\s+/g, "_");

      const { error } = await supabase
        .from("expense_categories" as any)
        .insert({
          restaurant_id: restaurantId,
          name: newCategoryName.trim(),
          slug,
          description: newCategoryDesc.trim() || null,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      setFormData({ ...formData, category: slug });
      setShowNewCategory(false);
      setNewCategoryName("");
      setNewCategoryDesc("");
      toast({
        title: "Category Added",
        description: `"${newCategoryName.trim()}" is now available`,
      });
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create category",
        variant: "destructive",
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.amount || !expenseDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

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

      const expenseData = {
        restaurant_id: profile.restaurant_id,
        category: formData.category,
        subcategory: formData.subcategory || null,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        expense_date: format(expenseDate, "yyyy-MM-dd"),
        payment_method: formData.payment_method,
        vendor_name: formData.vendor_name || null,
        is_recurring: formData.is_recurring,
        recurring_frequency: formData.is_recurring
          ? formData.recurring_frequency
          : null,
      };

      if (editExpense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editExpense.id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Expense updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert({ ...expenseData, created_by: session.user.id });
        if (error) throw error;
        toast({
          title: "Success",
          description: "Expense recorded successfully",
        });
      }

      setFormData({
        category: "",
        subcategory: "",
        amount: "",
        description: "",
        payment_method: "cash",
        vendor_name: "",
        is_recurring: false,
        recurring_frequency: "",
      });
      setExpenseDate(new Date());

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating expense:", error);
      toast({
        title: "Error",
        description: "Failed to record expense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editExpense ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
          <DialogDescription>
            Record a new business expense for tracking and analysis.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              {!showNewCategory ? (
                <div className="space-y-2">
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      if (value === "__new__") {
                        setShowNewCategory(true);
                      } else {
                        setFormData({ ...formData, category: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                          {!category.isSystem && (
                            <span className="ml-1 text-xs text-purple-500">
                              ★
                            </span>
                          )}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="__new__"
                        className="text-purple-600 dark:text-purple-400 font-semibold border-t mt-1"
                      >
                        <span className="flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Add New Category
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      New Category
                    </span>
                  </div>
                  <Input
                    placeholder="Category name (e.g., Fuel, Packaging)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="text-sm"
                    autoFocus
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim() || savingCategory}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {savingCategory ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategoryName("");
                        setNewCategoryDesc("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({currencySymbol}) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense-date">Expense Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expenseDate ? format(expenseDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expenseDate}
                    onSelect={setExpenseDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) =>
                  setFormData({ ...formData, subcategory: e.target.value })
                }
                placeholder="e.g., Vegetables, Cleaning supplies"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor/Supplier</Label>
              <Input
                id="vendor"
                value={formData.vendor_name}
                onChange={(e) =>
                  setFormData({ ...formData, vendor_name: e.target.value })
                }
                placeholder="Vendor name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Additional details about this expense"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_recurring: checked })
              }
            />
            <Label htmlFor="recurring">This is a recurring expense</Label>
          </div>

          {formData.is_recurring && (
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={formData.recurring_frequency}
                onValueChange={(value) =>
                  setFormData({ ...formData, recurring_frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {recurringFrequencies.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Recording..."
                : editExpense
                  ? "Update Expense"
                  : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseForm;
