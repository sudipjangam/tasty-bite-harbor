
import React from "react";
import { useForm } from "react-hook-form";
import {
  EnhancedDialog,
  EnhancedDialogContent,
  EnhancedDialogHeader,
  EnhancedDialogTitle,
  EnhancedDialogDescription,
  EnhancedDialogFooter,
} from "@/components/ui/enhanced-dialog";
import {
  EnhancedForm,
  EnhancedFormField,
  EnhancedFormItem,
  EnhancedFormLabel,
  EnhancedFormControl,
  EnhancedFormDescription,
  EnhancedFormMessage,
} from "@/components/ui/enhanced-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InventoryFormData {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel?: number;
  costPerUnit?: number;
}

interface EnhancedInventoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryFormData) => void;
  editingItem?: any;
  isLoading?: boolean;
}

const categories = ["Vegetables", "Fruits", "Groceries", "Dairy", "Meat", "Beverages", "Other"];
const units = ["kg", "g", "l", "ml", "units", "pieces", "boxes", "packs"];

export const EnhancedInventoryForm: React.FC<EnhancedInventoryFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  isLoading = false
}) => {
  const form = useForm<InventoryFormData>({
    defaultValues: {
      name: editingItem?.name || "",
      category: editingItem?.category || "Other",
      quantity: editingItem?.quantity || 0,
      unit: editingItem?.unit || "kg",
      reorderLevel: editingItem?.reorder_level || undefined,
      costPerUnit: editingItem?.cost_per_unit || undefined,
    }
  });

  const handleSubmit = (data: InventoryFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <EnhancedDialog open={isOpen} onOpenChange={onClose}>
      <EnhancedDialogContent size="md" type="default">
        <EnhancedDialogHeader>
          <EnhancedDialogTitle>
            {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
          </EnhancedDialogTitle>
          <EnhancedDialogDescription>
            {editingItem 
              ? "Update the details for this inventory item."
              : "Add a new item to your inventory with all the necessary details."
            }
          </EnhancedDialogDescription>
        </EnhancedDialogHeader>

        <EnhancedForm {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EnhancedFormField
                control={form.control}
                name="name"
                rules={{ required: "Item name is required" }}
                render={({ field }) => (
                  <EnhancedFormItem>
                    <EnhancedFormLabel required>Item Name</EnhancedFormLabel>
                    <EnhancedFormControl>
                      <Input placeholder="Enter item name" {...field} />
                    </EnhancedFormControl>
                    <EnhancedFormDescription type="info">
                      Use a clear, descriptive name for the item
                    </EnhancedFormDescription>
                    <EnhancedFormMessage />
                  </EnhancedFormItem>
                )}
              />

              <EnhancedFormField
                control={form.control}
                name="category"
                rules={{ required: "Category is required" }}
                render={({ field }) => (
                  <EnhancedFormItem>
                    <EnhancedFormLabel required>Category</EnhancedFormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <EnhancedFormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </EnhancedFormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <EnhancedFormMessage />
                  </EnhancedFormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EnhancedFormField
                control={form.control}
                name="quantity"
                rules={{ 
                  required: "Quantity is required",
                  min: { value: 0, message: "Quantity must be positive" }
                }}
                render={({ field }) => (
                  <EnhancedFormItem>
                    <EnhancedFormLabel required>Current Quantity</EnhancedFormLabel>
                    <EnhancedFormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Enter quantity" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </EnhancedFormControl>
                    <EnhancedFormMessage />
                  </EnhancedFormItem>
                )}
              />

              <EnhancedFormField
                control={form.control}
                name="unit"
                rules={{ required: "Unit is required" }}
                render={({ field }) => (
                  <EnhancedFormItem>
                    <EnhancedFormLabel required>Unit</EnhancedFormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <EnhancedFormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </EnhancedFormControl>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <EnhancedFormMessage />
                  </EnhancedFormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EnhancedFormField
                control={form.control}
                name="reorderLevel"
                render={({ field }) => (
                  <EnhancedFormItem>
                    <EnhancedFormLabel>Reorder Level</EnhancedFormLabel>
                    <EnhancedFormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Enter reorder level" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </EnhancedFormControl>
                    <EnhancedFormDescription type="warning">
                      You'll be notified when stock falls below this level
                    </EnhancedFormDescription>
                    <EnhancedFormMessage />
                  </EnhancedFormItem>
                )}
              />

              <EnhancedFormField
                control={form.control}
                name="costPerUnit"
                render={({ field }) => (
                  <EnhancedFormItem>
                    <EnhancedFormLabel>Cost per Unit (₹)</EnhancedFormLabel>
                    <EnhancedFormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Enter cost per unit" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </EnhancedFormControl>
                    <EnhancedFormDescription>
                      Optional: helps with cost tracking and reporting
                    </EnhancedFormDescription>
                    <EnhancedFormMessage />
                  </EnhancedFormItem>
                )}
              />
            </div>

            <EnhancedDialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
              </Button>
            </EnhancedDialogFooter>
          </form>
        </EnhancedForm>
      </EnhancedDialogContent>
    </EnhancedDialog>
  );
};
