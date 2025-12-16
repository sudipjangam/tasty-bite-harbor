import { useState, useRef, useEffect } from "react";
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
import { X, Upload, Loader2, Image as ImageIcon, Sparkles, ChefHat, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
}

interface AddMenuItemFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editingItem?: MenuItem | null;
}

type FormData = {
  name: string;
  description: string;
  price: string;
  category: string;
  image_url: string;
  is_veg: boolean;
  is_special: boolean;
};

const AddMenuItemForm = ({ onClose, onSuccess, editingItem }: AddMenuItemFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(editingItem?.image_url || "");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const { categories, addCategory, isAddingCategory } = useCategories();

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

      console.log('Fetched user profile:', profile);
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
      is_veg: editingItem ? (editingItem.is_veg ?? true) : true, // Default to veg for new items
      is_special: editingItem?.is_special ?? false,
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
        is_veg: editingItem.is_veg ?? true,
        is_special: editingItem.is_special ?? false,
      });
      setUploadedImageUrl(editingItem.image_url || "");
    } else {
      // New item - reset to defaults with is_veg = true
      form.reset({
        name: "",
        description: "",
        price: "",
        category: "",
        image_url: "",
        is_veg: true, // Default to vegetarian
        is_special: false,
      });
      setUploadedImageUrl("");
    }
  }, [editingItem, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        });
        return;
      }
      
      // Check file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const uploadImage = async () => {
    if (!selectedFile) return null;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const { uploadImage: uploadToFreeHost } = await import('@/utils/imageUpload');
      const imageUrl = await uploadToFreeHost(selectedFile, (progress) => {
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
      console.log("Submitting menu item:", data);

      if (!userProfile?.restaurant_id) {
        throw new Error('No restaurant assigned to user');
      }
      
      // If there's a selected file but not yet uploaded, upload it now
      let imageUrl = uploadedImageUrl || data.image_url;
      if (selectedFile && !uploadedImageUrl) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const menuItemData = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        category: data.category,
        image_url: imageUrl,
        is_available: true,
        is_veg: Boolean(data.is_veg), // Explicit Boolean conversion
        is_special: Boolean(data.is_special), // Explicit Boolean conversion
        updated_at: new Date().toISOString(), // Track update time
      };

      console.log("Saving menu item with data:", menuItemData);
      console.log("is_veg value:", data.is_veg, "->", menuItemData.is_veg);
      console.log("Editing item ID:", editingItem?.id);
      console.log("Restaurant ID:", userProfile.restaurant_id);

      if (editingItem) {
        // Update existing menu item - include restaurant_id for RLS
        const { error, data: updatedData } = await supabase
          .from("menu_items")
          .update(menuItemData)
          .eq("id", editingItem.id)
          .eq("restaurant_id", userProfile.restaurant_id) // RLS requirement
          .select();

        if (error) {
          console.error("Supabase update error:", error);
          throw error;
        }
        
        console.log("Updated menu item result:", updatedData);
        
        // Check if update actually happened
        if (!updatedData || updatedData.length === 0) {
          console.error("No rows were updated - RLS policy may be blocking the update");
          throw new Error("Failed to update menu item. Please check permissions.");
        }

        toast({
          title: "Success",
          description: "Menu item updated successfully",
        });
      } else {
        // Insert new menu item
        const { error } = await supabase
          .from("menu_items")
          .insert([{
            ...menuItemData,
            restaurant_id: userProfile.restaurant_id,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Menu item added successfully",
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding/updating menu item:", error);
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
        description: "Category name cannot be empty",
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

  return (
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl w-full max-w-2xl relative animate-fade-in overflow-y-auto max-h-[75vh]">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-green-500/20 dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-green-900/30 border-b border-white/20 dark:border-gray-700/30 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
                  {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-1 mt-1">
                  <Sparkles className="h-4 w-4" />
                  Create delicious offerings for your customers
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white/20 transition-all duration-200"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Item Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter item name" 
                          className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your delicious item..." 
                          className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 min-h-[100px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Category</FormLabel>
                        <div className="space-y-2">
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
                              <SelectTrigger className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 transition-all duration-200 text-gray-900 dark:text-white">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-xl shadow-xl max-h-[300px]">
                              {categories.map((category) => (
                                <SelectItem key={category} value={category} className="rounded-lg">
                                  {category}
                                </SelectItem>
                              ))}
                              <SelectItem 
                                value="__create_new__" 
                                className="rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100"
                              >
                                <div className="flex items-center gap-2">
                                  <Plus className="h-4 w-4" />
                                  Create New Category
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Price (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Special Options */}
              <div className="bg-gradient-to-r from-gray-50/80 to-white/80 dark:from-gray-700/50 dark:to-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  Special Options
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="is_veg"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold text-green-700">🌱 Vegetarian</FormLabel>
                          <FormDescription className="text-green-600 dark:text-green-400">
                            Mark as vegetarian item
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_special"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold text-purple-700">⭐ Special</FormLabel>
                          <FormDescription className="text-purple-600 dark:text-purple-400">
                            Mark as restaurant special
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-purple-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Image Upload Section */}
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Item Image</FormLabel>
                    <div className="space-y-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      {!selectedFile && !uploadedImageUrl && (
                        <div 
                          onClick={triggerFileInput}
                          className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-300 group"
                        >
                          <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-all duration-200">
                            <ImageIcon className="h-8 w-8 text-emerald-600" />
                          </div>
                          <p className="text-lg font-semibold text-emerald-700 mt-3">Upload Item Image</p>
                          <p className="text-sm text-emerald-600 mt-1">PNG, JPG or GIF (max 5MB)</p>
                        </div>
                      )}
                      
                      {selectedFile && !uploadedImageUrl && (
                        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700 truncate max-w-[250px]">
                              📁 {selectedFile.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeImage}
                              className="h-8 w-8 p-0 rounded-lg hover:bg-red-100 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {isUploading ? (
                            <div className="space-y-3">
                              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                              <p className="text-sm text-gray-600 text-center font-medium">Uploading... {uploadProgress}%</p>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={uploadImage}
                              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-600 text-white border-0 rounded-xl"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Image
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {uploadedImageUrl && (
                        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl overflow-hidden">
                          <div className="relative aspect-video">
                            <img 
                              src={uploadedImageUrl} 
                              alt="Uploaded item" 
                              className="object-cover w-full h-full"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={removeImage}
                              className="absolute top-3 right-3 h-8 w-8 p-0 rounded-full shadow-lg backdrop-blur-sm"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="p-3 bg-gray-50/80">
                            <p className="text-xs text-gray-600 truncate">
                              ✅ Image uploaded successfully
                            </p>
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  type="button"
                  className="px-6 py-2.5 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || isUploading}
                  className="px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
            </form>
          </Form>
        </div>
      </div>
    </div>
    </>
  );
};

export default AddMenuItemForm;
