import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Plus, Edit, Trash2, Snowflake, Thermometer, Box, Coffee,
  Package, MoreHorizontal, Warehouse,
} from "lucide-react";

interface StorageLocation {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  location_type: string;
  is_active: boolean;
  created_at: string;
}

const LOCATION_TYPES = [
  { value: "freezer", label: "Freezer", icon: Snowflake, color: "from-blue-500 to-cyan-500" },
  { value: "refrigerator", label: "Refrigerator", icon: Thermometer, color: "from-sky-500 to-blue-500" },
  { value: "dry_storage", label: "Dry Storage", icon: Box, color: "from-amber-500 to-orange-500" },
  { value: "counter", label: "Counter/Display", icon: Coffee, color: "from-emerald-500 to-green-500" },
  { value: "other", label: "Other", icon: Package, color: "from-gray-500 to-gray-600" },
];

const StorageLocations = () => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("dry_storage");

  // Fetch storage locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["storage-locations", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("storage_locations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");
      if (error) throw error;
      return data as StorageLocation[];
    },
    enabled: !!restaurantId,
  });

  // Fetch inventory items with their storage location assignments
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["storage-inventory-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, quantity, unit, cost_per_unit, storage_location_id, category")
        .eq("restaurant_id", restaurantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error("No restaurant");

      if (editingLocation) {
        const { error } = await supabase
          .from("storage_locations")
          .update({
            name: formName,
            description: formDescription || null,
            location_type: formType,
          })
          .eq("id", editingLocation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("storage_locations").insert({
          restaurant_id: restaurantId,
          name: formName,
          description: formDescription || null,
          location_type: formType,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      toast({ title: "Success", description: editingLocation ? "Location updated" : "Location created" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First unassign any items from this location
      await supabase
        .from("inventory_items")
        .update({ storage_location_id: null })
        .eq("storage_location_id", id);

      const { error } = await supabase.from("storage_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      queryClient.invalidateQueries({ queryKey: ["storage-inventory-items"] });
      toast({ title: "Success", description: "Location deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Assign item to location
  const assignMutation = useMutation({
    mutationFn: async ({ itemId, locationId }: { itemId: string; locationId: string | null }) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({ storage_location_id: locationId })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-inventory-items"] });
      toast({ title: "Success", description: "Item location updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (location?: StorageLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormName(location.name);
      setFormDescription(location.description || "");
      setFormType(location.location_type);
    } else {
      setEditingLocation(null);
      setFormName("");
      setFormDescription("");
      setFormType("dry_storage");
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingLocation(null);
    setFormName("");
    setFormDescription("");
    setFormType("dry_storage");
  };

  // Group items by location
  const getItemsForLocation = (locationId: string) =>
    inventoryItems.filter((item: any) => item.storage_location_id === locationId);

  const unassignedItems = inventoryItems.filter((item: any) => !item.storage_location_id);

  const getLocationTotal = (locationId: string) => {
    const items = getItemsForLocation(locationId);
    return items.reduce((sum: number, i: any) => sum + (i.quantity * (i.cost_per_unit || 0)), 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/30">
            <Warehouse className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Storage Locations
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {locations.length} locations · {unassignedItems.length} unassigned items
            </p>
          </div>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl shadow-md shadow-violet-500/30"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Location
        </Button>
      </div>

      {/* Location Cards */}
      {locations.length === 0 ? (
        <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
          <CardContent className="py-16 text-center">
            <Warehouse className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium text-gray-600 dark:text-gray-400">No storage locations yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create locations like "Walk-in Fridge", "Dry Store", "Freezer" to organize your inventory.
            </p>
            <Button onClick={() => handleOpenDialog()} className="mt-4 rounded-xl" variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Create First Location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => {
            const typeConfig = LOCATION_TYPES.find((t) => t.value === location.location_type) || LOCATION_TYPES[4];
            const Icon = typeConfig.icon;
            const locationItems = getItemsForLocation(location.id);
            const locationTotal = getLocationTotal(location.id);

            return (
              <Card
                key={location.id}
                className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${typeConfig.color}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-gradient-to-br ${typeConfig.color} rounded-xl shadow-md`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">{location.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {typeConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(location)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/30"
                        onClick={() => deleteMutation.mutate(location.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  {location.description && (
                    <p className="text-xs text-gray-500 mt-1">{location.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>{locationItems.length}</strong> items
                    </span>
                    <span className="text-sm font-semibold">
                      {currencySymbol}{locationTotal.toFixed(0)} value
                    </span>
                  </div>

                  {locationItems.length > 0 ? (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {locationItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                        >
                          <span className="font-medium truncate">{item.name}</span>
                          <span className="text-gray-500 whitespace-nowrap ml-2">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-3">No items assigned</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Unassigned Items */}
      {unassignedItems.length > 0 && locations.length > 0 && (
        <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-gray-400 to-gray-500" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-500" />
              Unassigned Items ({unassignedItems.length})
            </CardTitle>
            <CardDescription>Assign these items to a storage location for organized stocktakes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Item</th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Stock</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Category</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Assign To</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedItems.map((item: any) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium">{item.name}</td>
                      <td className="text-right py-2.5 px-3 font-mono text-xs">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{item.category}</td>
                      <td className="py-2.5 px-3">
                        <Select
                          onValueChange={(v) =>
                            assignMutation.mutate({ itemId: item.id, locationId: v === "none" ? null : v })
                          }
                        >
                          <SelectTrigger className="w-[150px] h-8 rounded-lg text-xs">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingLocation ? "Edit Location" : "Add Storage Location"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Walk-in Fridge A"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="e.g. Main walk-in on left side of kitchen"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formName.trim() || saveMutation.isPending}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl"
            >
              {editingLocation ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StorageLocations;
