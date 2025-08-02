import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Plus, DollarSign, Receipt, TrendingUp, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { formatIndianCurrency } from "@/utils/formatters";

interface OperationalCost {
  id: string;
  cost_type: string;
  description: string;
  amount: number;
  cost_date: string;
  is_recurring: boolean;
  recurring_frequency?: string;
}

interface OperationalCostFormData {
  cost_type: string;
  description: string;
  amount: number;
  cost_date: string;
  is_recurring: boolean;
  recurring_frequency?: string;
}

const OperationalCostsManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<OperationalCost | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OperationalCostFormData>({
    defaultValues: {
      cost_type: "other",
      description: "",
      amount: 0,
      cost_date: new Date().toISOString().split('T')[0],
      is_recurring: false,
      recurring_frequency: undefined,
    },
  });

  const { data: operationalCosts, isLoading } = useQuery({
    queryKey: ['operational-costs'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from('operational_costs')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('cost_date', { ascending: false });

      if (error) throw error;
      return data as OperationalCost[];
    },
  });

  const createCostMutation = useMutation({
    mutationFn: async (data: OperationalCostFormData) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { error } = await supabase
        .from('operational_costs')
        .insert({
          ...data,
          restaurant_id: profile.restaurant_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-costs'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Operational cost added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add operational cost",
        variant: "destructive",
      });
    },
  });

  const updateCostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: OperationalCostFormData }) => {
      const { error } = await supabase
        .from('operational_costs')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-costs'] });
      setIsDialogOpen(false);
      setEditingCost(null);
      form.reset();
      toast({
        title: "Success",
        description: "Operational cost updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update operational cost",
        variant: "destructive",
      });
    },
  });

  const deleteCostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('operational_costs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-costs'] });
      toast({
        title: "Success",
        description: "Operational cost deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete operational cost",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: OperationalCostFormData) => {
    if (editingCost) {
      updateCostMutation.mutate({ id: editingCost.id, data });
    } else {
      createCostMutation.mutate(data);
    }
  };

  const handleEdit = (cost: OperationalCost) => {
    setEditingCost(cost);
    form.reset({
      cost_type: cost.cost_type,
      description: cost.description,
      amount: cost.amount,
      cost_date: cost.cost_date,
      is_recurring: cost.is_recurring,
      recurring_frequency: cost.recurring_frequency,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCost(null);
    form.reset();
  };

  const costTypeIcons = {
    rent: <DollarSign className="h-4 w-4" />,
    utilities: <AlertTriangle className="h-4 w-4" />,
    marketing: <TrendingUp className="h-4 w-4" />,
    maintenance: <Receipt className="h-4 w-4" />,
    other: <Receipt className="h-4 w-4" />,
  };

  const costTypeColors = {
    rent: "bg-red-100 text-red-800",
    utilities: "bg-blue-100 text-blue-800",
    marketing: "bg-green-100 text-green-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    other: "bg-gray-100 text-gray-800",
  };

  // Calculate totals
  const totalMonthlyCosts = operationalCosts?.reduce((total, cost) => {
    if (cost.is_recurring && cost.recurring_frequency === 'monthly') {
      return total + cost.amount;
    } else if (!cost.is_recurring) {
      const costDate = new Date(cost.cost_date);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      if (costDate.getMonth() === currentMonth && costDate.getFullYear() === currentYear) {
        return total + cost.amount;
      }
    }
    return total;
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Operational Costs</h3>
          <p className="text-sm text-muted-foreground">
            Track and manage your restaurant's operational expenses
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cost
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCost ? "Edit Operational Cost" : "Add Operational Cost"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cost_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cost type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rent">Rent</SelectItem>
                            <SelectItem value="utilities">Utilities</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Enter amount"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter cost description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="is_recurring"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Recurring Cost</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("is_recurring") && (
                  <FormField
                    control={form.control}
                    name="recurring_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCost ? "Update" : "Add"} Cost
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIndianCurrency(totalMonthlyCosts).formatted}</div>
            <p className="text-xs text-muted-foreground">Current month expenses</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operationalCosts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Recorded costs</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recurring Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {operationalCosts?.filter(cost => cost.is_recurring).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active recurring costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Costs List */}
      <Card>
        <CardHeader>
          <CardTitle>Cost History</CardTitle>
          <CardDescription>
            View and manage all operational costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : operationalCosts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No operational costs recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {operationalCosts?.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${costTypeColors[cost.cost_type as keyof typeof costTypeColors]}`}>
                      {costTypeIcons[cost.cost_type as keyof typeof costTypeIcons]}
                    </div>
                    <div>
                      <div className="font-medium capitalize">{cost.cost_type.replace('_', ' ')}</div>
                      <div className="text-sm text-muted-foreground">{cost.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(cost.cost_date), 'MMM dd, yyyy')}
                        {cost.is_recurring && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {cost.recurring_frequency}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-lg font-semibold">
                      {formatIndianCurrency(cost.amount).formatted}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(cost)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCostMutation.mutate(cost.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationalCostsManager;