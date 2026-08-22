import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { X, Upload, Loader2, Image as ImageIcon, Sparkles, ChefHat, Plus, Scale, Layers, Lightbulb, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UNITS } from "@/constants/units";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  is_available: boolean;
  is_veg?: boolean;
  is_special?: boolean;
  pricing_type?: string;
  pricing_unit?: string;
  base_unit_quantity?: number;
}

interface AddMenuItemFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editingItem?: MenuItem | null;
}

type DietaryType = "veg" | "non_veg" | "other";

type FormData = {
  name: string;
  description: string;
  price: string;
  category: string;
  image_url: string;
  dietary_type: DietaryType;
  is_special: boolean;
  pricing_type: string;
  pricing_unit: string;
  base_unit_quantity: string;
};

interface VariantRow {
  id?: string;
  name: string;
  price: string;
  isExisting?: boolean;
}

const getDietaryType = (item?: MenuItem | null): DietaryType => {
  if (!item) return "veg"; // Default new item to Veg
  if (item.is_veg === true) return "veg";
  if (item.is_veg === false) return "non_veg";
  return "other";
};

const AddMenuItemForm = ({ onClose, onSuccess, editingItem }: AddMenuItemFormProps) => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(editingItem?.image_url || "");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  
  const { categories, addCategory, isAddingCategory } = useCategories();

  // Fetch existing variants when editing
  useEffect(() => {
    if (editingItem?.id) {
      (async () => {
        const { data } = await supabase
          .from('menu_item_variants')
          .select('*')
          .eq('menu_item_id', editingItem.id)
          .order('sort_order');
        if (data && data.length > 0) {
          setVariants(data.map(v => ({ id: v.id, name: v.name, price: String(v.price), isExisting: true })));
        }
      })();
    }
  }, [editingItem?.id]);

  // Smart pricing hint for variants
  const getVariantPriceHint = (index: number): string | null => {
    if (index === 0 || variants.length === 0) return null;
    const firstPrice = parseFloat(variants[0].price);
    if (isNaN(firstPrice) || firstPrice <= 0) return null;
    
    if (index === 1) {
      const suggested = Math.round(firstPrice * 1.5);
      return `💡 Tip: ₹${suggested} (1.5× of ${variants[0].name}) works well for medium sizes`;
    }
    if (index === 2) {
      const suggested = Math.round(firstPrice * 2);
      return `💡 Tip: ₹${suggested} (2× of ${variants[0].name}) is a common large size price`;
    }
    return null;
  };

  // Fetch user's restaurant_id from their profile
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (!profile?.restaurant_id) throw new Error('No restaurant assigned');

      return profile;
    },
  });

  const form = useForm<FormData>({
    defaultValues: {
      name: editingItem?.name || "",
      description: editingItem?.description || "",
      price: editingItem?.price ? String(editingItem.price) : "",
      category: editingItem?.category || "",
      image_url: editingItem?.image_url || "",
      dietary_type: getDietaryType(editingItem),
      is_special: editingItem?.is_special ?? false,
      pricing_type: editingItem?.pricing_type || "fixed",
      pricing_unit: editingItem?.pricing_unit || "piece",
      base_unit_quantity: editingItem?.base_unit_quantity ? String(editingItem.base_unit_quantity) : "1",
    },
  });

  // Reset form when editingItem changes
  useEffect(() => {
    if (editingItem) {
      // Editing existing item - use item's values
      form.reset({
        name: editingItem.name || "",
        description: editingItem.description || "",
        price: editingItem.price ? String(editingItem.price) : "",
        category: editingItem.category || "",
        image_url: editingItem.image_url || "",
        dietary_type: getDietaryType(editingItem),
        is_special: editingItem.is_special ?? false,
        pricing_type: editingItem.pricing_type || "fixed",
        pricing_unit: editingItem.pricing_unit || "piece",
        base_unit_quantity: editingItem.base_unit_quantity ? String(editingItem.base_unit_quantity) : "1",
      });
      setUploadedImageUrl(editingItem.image_url || "");
    } else {
      // New item - reset to defaults with dietary_type = "veg"
      form.reset({
        name: "",
        description: "",
        price: "",
        category: "",
        image_url: "",
        dietary_type: "veg",
        is_special: false,
        pricing_type: "fixed",
        pricing_unit: UNITS.PIECE,
        base_unit_quantity: "1",
      });
      setUploadedImageUrl("");
    }
  }, [editingItem, form]);

  const uploadImage = async (fileToUpload: File) => {
    if (!fileToUpload) return null;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const { uploadImage: uploadToFreeHost } = await import('@/utils/imageUpload');
      const imageUrl = await uploadToFreeHost(fileToUpload, (progress) => {
        setUploadProgress(progress);
      });
      
      setUploadedImageUrl(imageUrl);
      form.setValue('image_url', imageUrl);
      
      toast({
        title: "Image uploaded successfully",
        description: "Menu item image has been uploaded and resized to passport size.",
      });
      
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.heic') && !file.name.toLowerCase().endsWith('.heif')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, GIF, or HEIC)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    await uploadImage(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const removeImage = () => {
    setSelectedFile(null);
    setUploadedImageUrl("");
    form.setValue('image_url', "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      const targetRestaurantId = restaurantId || userProfile?.restaurant_id;

      if (!editingItem && !targetRestaurantId) {
        throw new Error('No restaurant assigned to user');
      }
      
      // If there's a selected file but not yet uploaded, upload it now
      let imageUrl = uploadedImageUrl || data.image_url;
      if (selectedFile && !uploadedImageUrl) {
        const uploadedUrl = await uploadImage(selectedFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      // Map dietary_type: "veg" -> true, "non_veg" -> false, "other" -> null
      const isVeg = data.dietary_type === "veg" ? true : data.dietary_type === "non_veg" ? false : null;

      const menuItemData = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        category: data.category || "Other",
        image_url: imageUrl,
        is_available: true,
        is_veg: isVeg,
        is_special: Boolean(data.is_special),
        pricing_type: data.pricing_type || "fixed",
        pricing_unit: data.pricing_type !== "fixed" ? data.pricing_unit : null,
        base_unit_quantity: data.pricing_type !== "fixed" ? parseFloat(data.base_unit_quantity) || 1 : null,
        updated_at: new Date().toISOString(),
      };

      let savedItemId = editingItem?.id;

      if (editingItem) {
        const { error, data: updatedData } = await supabase
          .from("menu_items")
          .update(menuItemData)
          .eq("id", editingItem.id)
          .select();

        if (error) throw error;
        if (!updatedData || updatedData.length === 0) {
          throw new Error("Failed to update menu item. Please check permissions.");
        }

        toast({ title: "Success", description: "Menu item updated successfully" });
      } else {
        const { data: insertedData, error } = await supabase
          .from("menu_items")
          .insert([{ ...menuItemData, restaurant_id: targetRestaurantId }])
          .select()
          .single();

        if (error) throw error;
        savedItemId = insertedData?.id;
        toast({ title: "Success", description: "Menu item added successfully" });
      }

      // Save variants
      if (savedItemId) {
        // Delete removed variants
        if (deletedVariantIds.length > 0) {
          await supabase
            .from('menu_item_variants')
            .delete()
            .in('id', deletedVariantIds);
        }

        // Upsert / insert current variants
        const validVariants = variants.filter(v => v.name.trim() && v.price && parseFloat(v.price) > 0);
        for (let i = 0; i < validVariants.length; i++) {
          const v = validVariants[i];
          const variantPayload = {
            menu_item_id: savedItemId,
            restaurant_id: targetRestaurantId,
            name: v.name.trim(),
            price: parseFloat(v.price),
            sort_order: i,
            is_available: true,
          };
          if (v.id && v.isExisting) {
            await supabase
              .from('menu_item_variants')
              .update(variantPayload)
              .eq('id', v.id);
          } else {
            await supabase
              .from('menu_item_variants')
              .insert([variantPayload]);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save menu item",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    if (categories.some(c => c.toLowerCase() === newCategoryName.toLowerCase())) {
      toast({
        title: "Error",
        description: "This category already exists",
        variant: "destructive",
      });
      return;
    }

    addCategory(newCategoryName, {
      onSuccess: () => {
        form.setValue('category', newCategoryName);
        setShowNewCategoryDialog(false);
        setNewCategoryName("");
      },
    });
  };

  return createPortal(
    <>
      {/* New Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Create New Category
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                Category Name
              </label>
              <Input
                placeholder="e.g., Toasts, Sandwiches, Rice Bowls"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewCategory();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewCategoryDialog(false);
                setNewCategoryName("");
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddNewCategory}
              disabled={isAddingCategory}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl"
            >
              {isAddingCategory ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Category
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div 
        className="bg-white dark:bg-gray-900 border-t sm:border border-gray-200 dark:border-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[88vh] relative flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-2 duration-300"
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-1 flex-shrink-0" />

        {/* Sticky Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-green-500/15 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-green-950/40 border-b border-gray-100 dark:border-gray-800 px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-md text-white">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent leading-tight">
                {editingItem ? "Edit Menu Item" : "Add New Item"}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                {editingItem ? "Update dish details, pricing & options" : "Create delicious restaurant offering"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5">
          <Form {...form}>
            <form id="menu-item-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Name and Price in 2 columns */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        📝 Item Name
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Paneer Tikka" 
                          className="h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus-visible:ring-emerald-500 font-medium" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        💰 Price (₹)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0.00" 
                          className="h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus-visible:ring-emerald-500 font-bold text-indigo-600 dark:text-indigo-400" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category and Description in a row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category selector */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">
                        📂 Category
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          if (value === "__create_new__") {
                            setShowNewCategoryDialog(true);
                          } else {
                            field.onChange(value);
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus-visible:ring-emerald-500">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-[220px]">
                          {categories.map((category) => (
                            <SelectItem key={category} value={category} className="text-sm rounded-lg">
                              {category}
                            </SelectItem>
                          ))}
                          <SelectItem 
                            value="__create_new__" 
                            className="text-sm text-emerald-600 dark:text-emerald-400 font-bold rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="h-3.5 w-3.5" />
                              New Category
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">
                        📄 Description
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Short description..." 
                          className="h-10 min-h-[40px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus-visible:ring-emerald-500 py-2" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dietary Type & Special Option */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="dietary_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                            <span>Diet / Food Type</span>
                            <span className="text-[10px] text-gray-400 font-normal">Select one</span>
                          </FormLabel>
                          <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                            <button
                              type="button"
                              onClick={() => field.onChange("veg")}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                                field.value === "veg"
                                  ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-emerald-800"
                                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                              }`}
                            >
                              <span className="w-3.5 h-3.5 rounded-xs border-[1.5px] border-emerald-600 p-[1px] flex items-center justify-center bg-white flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              </span>
                              <span>Veg</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => field.onChange("non_veg")}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                                field.value === "non_veg"
                                  ? "bg-white dark:bg-gray-700 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200 dark:border-rose-800"
                                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                              }`}
                            >
                              <span className="w-3.5 h-3.5 rounded-xs border-[1.5px] border-rose-600 p-[1px] flex items-center justify-center bg-white flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                              </span>
                              <span>Non-Veg</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => field.onChange("other")}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                                field.value === "other"
                                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600"
                                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                              }`}
                            >
                              <span>⚪</span>
                              <span>Other</span>
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_special"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-2xl border border-purple-200/80 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/20 p-3 shadow-xs self-end h-[58px]">
                        <div className="space-y-0.5 pr-2">
                          <FormLabel className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1 cursor-pointer">
                            ⭐ Special
                          </FormLabel>
                          <FormDescription className="text-[10px] text-purple-600/80 dark:text-purple-400/80">
                            Highlight
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-purple-500 scale-90"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Pricing Configuration */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl p-3.5 border border-blue-200/60 dark:border-blue-800/40">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-blue-500" />
                    Pricing Configuration
                  </h3>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Fixed or weight/volume</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <FormField
                    control={form.control}
                    name="pricing_type"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs">
                              <SelectValue placeholder="Pricing type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-xl">
                            <SelectItem value="fixed" className="rounded-lg text-xs">📦 Fixed Price</SelectItem>
                            <SelectItem value="weight" className="rounded-lg text-xs">⚖️ By Weight (kg/g)</SelectItem>
                            <SelectItem value="volume" className="rounded-lg text-xs">🧴 By Volume (L/ml)</SelectItem>
                            <SelectItem value="unit" className="rounded-lg text-xs">🔢 By Unit/Piece</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("pricing_type") !== "fixed" && (
                    <>
                      <FormField
                        control={form.control}
                        name="pricing_unit"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs">
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-xl">
                                {form.watch("pricing_type") === "weight" && (
                                  <>
                                    <SelectItem value="kg" className="rounded-lg text-xs">Kilogram (kg)</SelectItem>
                                    <SelectItem value="g" className="rounded-lg text-xs">Gram (g)</SelectItem>
                                  </>
                                )}
                                {form.watch("pricing_type") === "volume" && (
                                  <>
                                    <SelectItem value={UNITS.L} className="rounded-lg text-xs">Litre (l)</SelectItem>
                                    <SelectItem value={UNITS.ML} className="rounded-lg text-xs">Millilitre (ml)</SelectItem>
                                  </>
                                )}
                                {form.watch("pricing_type") === "unit" && (
                                  <>
                                    <SelectItem value={UNITS.PIECE} className="rounded-lg text-xs">Piece</SelectItem>
                                    <SelectItem value="plate" className="rounded-lg text-xs">Plate</SelectItem>
                                    <SelectItem value="unit" className="rounded-lg text-xs">Unit</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="base_unit_quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="Base Qty (e.g. 1)"
                                className="h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                {/* Price Preview */}
                {form.watch("price") && (
                  <div className="mt-2.5 bg-white/70 dark:bg-gray-800/70 rounded-xl px-3 py-1.5 border border-blue-200/50 dark:border-blue-700/50 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    💰 Preview: ₹{form.watch("price")}
                    {form.watch("pricing_type") !== "fixed" && form.watch("pricing_unit") && (
                      <> per {form.watch("base_unit_quantity") || 1} {form.watch("pricing_unit")}</>
                    )}
                    {form.watch("pricing_type") === "fixed" && " (fixed price)"}
                  </div>
                )}
              </div>

              {/* Size Variants Section */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-3.5 border border-indigo-200/60 dark:border-indigo-800/40">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-500" />
                    Size Variants
                  </h3>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">e.g. Half / Full</span>
                </div>

                {variants.map((variant, index) => (
                  <div key={index} className="mb-2">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="e.g. Half, Large"
                        value={variant.name}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[index] = { ...updated[index], name: e.target.value };
                          setVariants(updated);
                        }}
                        className="flex-1 h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price (₹)"
                        value={variant.price}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[index] = { ...updated[index], price: e.target.value };
                          setVariants(updated);
                        }}
                        className="w-24 h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl flex-shrink-0"
                        onClick={() => {
                          if (variant.id && variant.isExisting) {
                            setDeletedVariantIds(prev => [...prev, variant.id!]);
                          }
                          setVariants(variants.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {getVariantPriceHint(index) && !variant.price && (
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5 ml-1 flex items-center gap-1 font-medium">
                        <Lightbulb className="h-3 w-3" />
                        {getVariantPriceHint(index)}
                      </p>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVariants([...variants, { name: '', price: '' }])}
                  className="w-full h-8 border border-dashed border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30 rounded-xl text-xs font-semibold mt-1"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Size Variant
                </Button>
              </div>

              {/* Image Upload Section */}
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">
                      Item Photo
                    </FormLabel>
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,.heic,.heif"
                        className="hidden"
                      />
                      
                      {!selectedFile && !uploadedImageUrl && (
                        <div 
                          onClick={triggerFileInput}
                          className="border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl p-4 flex items-center justify-center gap-3 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 group"
                        >
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl group-hover:scale-105 transition-transform text-emerald-600 dark:text-emerald-400">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Upload Dish Image</p>
                            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">PNG, JPG, GIF or HEIC (max 5MB)</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedFile && !uploadedImageUrl && (
                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                              📁 {selectedFile.name}
                            </span>
                            {!isUploading && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeImage}
                                className="h-7 w-7 p-0 rounded-lg text-rose-500 hover:bg-rose-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          {isUploading && (
                            <div className="space-y-1.5">
                              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300" 
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                              <p className="text-[10px] text-gray-500 text-center font-medium">Uploading... {uploadProgress}%</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {uploadedImageUrl && (
                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                          <div className="relative h-28 w-full bg-gray-100 dark:bg-gray-700">
                            <img 
                              src={uploadedImageUrl} 
                              alt="Uploaded item" 
                              className="object-cover w-full h-full"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={removeImage}
                              className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full shadow-md"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <Input
                        type="hidden"
                        {...field}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="flex-shrink-0 border-t border-gray-150 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-3.5 sm:p-4 flex items-center justify-end gap-2.5 rounded-b-none sm:rounded-b-3xl">
          <Button 
            variant="outline" 
            onClick={onClose} 
            type="button"
            className="px-5 h-10 rounded-xl border-gray-200 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="menu-item-form"
            disabled={isSubmitting || isUploading}
            className="px-6 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/25 disabled:opacity-50 transition-transform active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editingItem ? "Updating..." : "Adding..."}
              </>
            ) : (
              <>
                <ChefHat className="mr-2 h-4 w-4" />
                {editingItem ? "Update Item" : "Add Item"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
    </>,
    document.body
  );
};

export default AddMenuItemForm;
