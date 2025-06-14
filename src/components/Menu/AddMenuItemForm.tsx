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
import { X, Upload, Loader2, Image as ImageIcon, Sparkles, ChefHat } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      is_veg: editingItem?.is_veg ?? false,
      is_special: editingItem?.is_special ?? false,
    },
  });

  // Keep this in useEffect to handle any changes to editingItem
  useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name || "",
        description: editingItem.description || "",
        price: editingItem.price ? String(editingItem.price) : "",
        category: editingItem.category || "",
        image_url: editingItem.image_url || "",
        is_veg: editingItem.is_veg ?? false,
        is_special: editingItem.is_special ?? false,
      });
      setUploadedImageUrl(editingItem.image_url || "");
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
      setUploadProgress(10);
      
      // Convert file to base64
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          if (e.target?.result) {
            const base64String = e.target.result.toString().split(',')[1];
            resolve(base64String);
          } else {
            reject(new Error("Failed to convert file to base64"));
          }
        };
        reader.onerror = () => reject(reader.error);
      });
      
      reader.readAsDataURL(selectedFile);
      const base64String = await base64Promise;
      
      setUploadProgress(30);
      
      // Use Supabase Edge Function as a proxy to bypass CORS
      const { data, error } = await supabase.functions.invoke('upload-image', {
        body: { 
          base64Image: base64String,
          fileName: selectedFile.name,
          fileType: selectedFile.type
        }
      });
      
      if (error) {
        throw new Error(`Upload proxy failed: ${error.message}`);
      }
      
      setUploadProgress(80);
      
      console.log('Image upload response:', data);
      
      setUploadProgress(100);
      
      if (data.success && data.image && data.image.url) {
        setUploadedImageUrl(data.image.url);
        form.setValue('image_url', data.image.url);
        toast({
          title: "Image uploaded successfully",
        });
        return data.image.url;
      } else {
        throw new Error('Invalid response from image host');
      }
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
      let imageUrl = data.image_url;
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
        is_veg: data.is_veg,
        is_special: data.is_special,
      };

      console.log("Saving menu item with data:", menuItemData);

      if (editingItem) {
        // Update existing menu item
        const { error } = await supabase
          .from("menu_items")
          .update(menuItemData)
          .eq("id", editingItem.id);

        if (error) throw error;

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

  const categories = ["Main Course", "Appetizers", "Desserts", "Beverages", "Non-Veg", "Vegetarian", "Restaurant Specials", "Other"];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl w-full max-w-2xl relative animate-fade-in overflow-y-auto max-h-[90vh]">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-green-500/20 border-b border-white/20 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
                  {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
                </h2>
                <p className="text-gray-600 text-sm flex items-center gap-1 mt-1">
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
                      <FormLabel className="text-gray-700 font-semibold">Item Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter item name" 
                          className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200" 
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
                      <FormLabel className="text-gray-700 font-semibold">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your delicious item..." 
                          className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 min-h-[100px]" 
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
                        <FormLabel className="text-gray-700 font-semibold">Category</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:border-emerald-400 transition-all duration-200">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-xl shadow-xl">
                            {categories.map((category) => (
                              <SelectItem key={category} value={category} className="rounded-lg">
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-semibold">Price (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
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
              <div className="bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  Special Options
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="is_veg"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-xl border border-green-200 bg-green-50/50 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold text-green-700">🌱 Vegetarian</FormLabel>
                          <FormDescription className="text-green-600">
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
                      <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-xl border border-purple-200 bg-purple-50/50 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold text-purple-700">⭐ Special</FormLabel>
                          <FormDescription className="text-purple-600">
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
                    <FormLabel className="text-gray-700 font-semibold">Item Image</FormLabel>
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
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200/50">
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
  );
};

export default AddMenuItemForm;
