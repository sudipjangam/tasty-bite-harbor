import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  X, 
  Upload, 
  Camera, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  Trash2, 
  Plus, 
  Check, 
  ChevronRight, 
  AlertCircle
} from "lucide-react";

interface Variant {
  name: string;
  price: number;
}

interface ParsedItem {
  name: string;
  description: string;
  price: number;
  category: string;
  is_veg: boolean;
  is_special: boolean;
  variants: Variant[];
}

interface AIImportDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AIImportDialog = ({ onClose, onSuccess }: AIImportDialogProps) => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const { categories, addCategory } = useCategories();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");
  const [rawText, setRawText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<Record<string, { create: boolean; mapTo: string }>>({});
  const [showCategoriesManager, setShowCategoriesManager] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsingStep, setParsingStep] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Convert File to base64 helper
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle files selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setFilePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(filePreviews[index]);
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Clipboard paste event listener for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== "image") return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      const newPreviews: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const pastedFile = new File([file], `pasted-image-${Date.now()}-${i}.png`, { type: file.type });
            pastedFiles.push(pastedFile);
            newPreviews.push(URL.createObjectURL(pastedFile));
          }
        }
      }

      if (pastedFiles.length > 0) {
        setFiles((prev) => [...prev, ...pastedFiles]);
        setFilePreviews((prev) => [...prev, ...newPreviews]);
        toast({
          title: "Image pasted",
          description: `Successfully pasted ${pastedFiles.length} image(s) from clipboard.`,
        });
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [activeTab, toast]);

  // Trigger file selection
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Trigger camera capture
  const triggerCameraSelect = () => {
    cameraInputRef.current?.click();
  };

  // Parse menu with Edge Function calling Gemini
  const handleParse = async () => {
    try {
      setIsParsing(true);
      setParsingStep("Preparing your files...");

      let base64Images: string[] = [];
      if (activeTab === "image") {
        if (files.length === 0) {
          toast({
            title: "Error",
            description: "Please select or take at least one photo of the menu.",
            variant: "destructive",
          });
          setIsParsing(false);
          return;
        }

        setParsingStep("Converting images to high-quality data...");
        base64Images = await Promise.all(files.map((file) => fileToBase64(file)));
      } else {
        if (!rawText.trim()) {
          toast({
            title: "Error",
            description: "Please paste your raw menu list.",
            variant: "destructive",
          });
          setIsParsing(false);
          return;
        }
      }

      setParsingStep("Gemini is reading and organizing your menu...");
      
      const { data, error } = await supabase.functions.invoke("parse-menu", {
        body: {
          text: activeTab === "text" ? rawText : null,
          images: activeTab === "image" ? base64Images : null,
        },
      });

      if (error) throw error;

      if (data && Array.isArray(data.items)) {
        setParsedItems(data.items);
        
        // Initialize category mappings
        const uniqueParsedCategories = [...new Set(data.items.map((item: any) => item.category).filter(Boolean))] as string[];
        const initialMappings: Record<string, { create: boolean; mapTo: string }> = {};
        
        uniqueParsedCategories.forEach((cat: string) => {
          const catExists = categories.some((c) => c.toLowerCase() === cat.toLowerCase());
          if (!catExists) {
            initialMappings[cat] = {
              create: true, // Default to true (keep and create in DB)
              mapTo: categories[0] || "Main Course", // Default fallback if they toggle it off
            };
          }
        });
        setCategoryMappings(initialMappings);

        toast({
          title: "Successfully parsed",
          description: `Extracted ${data.items.length} items from your menu.`,
        });
      } else {
        throw new Error("Invalid response format from parsing service.");
      }

    } catch (error: any) {
      console.error("Parsing failed:", error);
      toast({
        title: "Parsing failed",
        description: error.message || "Failed to parse menu. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
      setParsingStep("");
    }
  };

  // Inline edit handlers
  const handleUpdateItem = (index: number, field: keyof ParsedItem, value: any) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddVariant = (itemIdx: number, name: string, price: number) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[itemIdx] };
      item.variants = [...(item.variants || []), { name, price }];
      updated[itemIdx] = item;
      return updated;
    });
  };

  const handleRemoveVariant = (itemIdx: number, variantIdx: number) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[itemIdx] };
      item.variants = item.variants.filter((_, i) => i !== variantIdx);
      updated[itemIdx] = item;
      return updated;
    });
  };

  // Combine existing DB categories and any new parsed categories that user has chosen to create
  const dropdownCategories = useMemo(() => {
    const newCatsToCreate = Object.entries(categoryMappings)
      .filter(([_, mapping]) => mapping.create)
      .map(([newCat]) => newCat);
      
    return Array.from(new Set([
      ...categories,
      ...newCatsToCreate,
      ...parsedItems.map(item => item.category).filter(Boolean)
    ])).sort((a, b) => a.localeCompare(b));
  }, [categories, categoryMappings, parsedItems]);

  // Save parsed items to DB
  const handleSaveItems = async () => {
    if (!restaurantId) return;

    try {
      setIsSaving(false);
      if (parsedItems.length === 0) {
        toast({
          title: "No items",
          description: "There are no items to import.",
          variant: "destructive",
        });
        return;
      }

      setIsSaving(true);
      
      // Step 1: Map items to their final categories
      const finalItems = parsedItems.map(item => {
        const mapping = categoryMappings[item.category];
        if (mapping && !mapping.create) {
          // If mapping exists and user chose NOT to create it, rewrite to the mapped default
          return { ...item, category: mapping.mapTo };
        }
        return item;
      });

      // Find unique categories from finalItems that need to be created in DB
      const categoriesToCreate = [...new Set(finalItems.map((item) => item.category).filter(Boolean))].filter(cat => {
        // Only create if it does NOT exist in existing categories
        const catExists = categories.some((c) => c.toLowerCase() === cat.toLowerCase());
        return !catExists;
      });

      for (const cat of categoriesToCreate) {
        const { error: insertError } = await supabase
          .from("categories")
          .upsert({ name: cat, restaurant_id: restaurantId }, { onConflict: "name" });

        if (insertError) {
          console.error("Error creating category:", insertError);
          // Continue anyway, but log it
        }
      }

      if (categoriesToCreate.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
      }

      // Fetch existing menu items to check for duplicates
      const { data: existingItems, error: existingError } = await supabase
        .from("menu_items")
        .select("name")
        .eq("restaurant_id", restaurantId);
        
      if (existingError) {
        throw existingError;
      }
      
      const existingNames = new Set(existingItems?.map(item => item.name.toLowerCase().trim()) || []);
      
      // Filter out duplicates
      const uniqueItemsToInsert = finalItems.filter(item => !existingNames.has(item.name.toLowerCase().trim()));
      const skippedCount = finalItems.length - uniqueItemsToInsert.length;
      
      if (uniqueItemsToInsert.length === 0) {
        toast({
          title: "Notice",
          description: `All ${finalItems.length} items already exist. No new items were added.`,
        });
        setIsSaving(false);
        onSuccess();
        onClose();
        return;
      }

      // Step 2: Insert menu items
      for (const item of uniqueItemsToInsert) {
        const menuItemData = {
          name: item.name,
          description: item.description || "",
          price: item.price || 0,
          category: item.category,
          is_veg: item.is_veg,
          is_special: item.is_special,
          is_available: true,
          restaurant_id: restaurantId,
          pricing_type: "fixed",
          updated_at: new Date().toISOString(),
        };

        const { data: insertedItem, error: itemError } = await supabase
          .from("menu_items")
          .insert([menuItemData])
          .select()
          .single();

        if (itemError) {
          console.error("Error saving menu item:", item.name, itemError);
          throw itemError;
        }

        // Step 3: Insert variants if any
        if (insertedItem && item.variants && item.variants.length > 0) {
          const variantsData = item.variants.map((v, idx) => ({
            menu_item_id: insertedItem.id,
            restaurant_id: restaurantId,
            name: v.name,
            price: v.price,
            sort_order: idx,
            updated_at: new Date().toISOString(),
          }));

          const { error: varError } = await supabase
            .from("menu_item_variants")
            .insert(variantsData);

          if (varError) {
            console.error("Error saving variants:", varError);
          }
        }
      }

      toast({
        title: "Success",
        description: `Successfully imported ${uniqueItemsToInsert.length} menu items! ${skippedCount > 0 ? `(${skippedCount} duplicates skipped)` : ""}`,
      });
      
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error("Bulk save failed:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to save menu items. Please check database connectivity.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-800/30 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-800/60 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  AI Menu Import & Parser
                </DialogTitle>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Generate or extract menu items from text list or photos instantly
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic content wrapper */}
        <div className="flex-1 overflow-auto p-4 md:p-6 min-h-0">
          {parsedItems.length === 0 ? (
            /* Input / Processing Step */
            isParsing ? (
              <div className="h-full flex flex-col items-center justify-center space-y-6 py-12">
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-20 w-20 animate-ping rounded-full bg-emerald-400/20"></div>
                  <div className="absolute h-14 w-14 animate-pulse rounded-full bg-teal-500/15"></div>
                  <div className="relative p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-2 max-w-sm">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Analyzing Menu Details</h3>
                  <p className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold animate-pulse">
                    {parsingStep}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                    This might take up to a minute depending on menu size. Do not close this window.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 h-full flex flex-col justify-between">
                {/* Method selector tab */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit self-center">
                  <button
                    onClick={() => setActiveTab("text")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "text"
                        ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Paste Menu List
                  </button>
                  <button
                    onClick={() => setActiveTab("image")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "image"
                        ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Upload / Camera
                  </button>
                </div>

                <div className="flex-1 min-h-0 flex flex-col justify-center">
                  {activeTab === "text" ? (
                    <div className="space-y-2 flex-1 flex flex-col">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Paste unstructured menu list below:
                      </label>
                      <Textarea
                        placeholder="Example:
Paneer Tikka - 250
Chicken Biryani - Half: 180, Full: 320 (Chef Special)
Chocolate Shake - 120
Veg Manchurian (Dry) - 150/220"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        className="flex-1 min-h-[220px] bg-gray-50/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 focus:border-emerald-500 resize-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 flex flex-col justify-center">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">
                        Upload or Capture your menu card images:
                      </label>
                      
                      {/* Image inputs */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,image/heic,image/heif"
                        multiple
                        className="hidden"
                      />
                      <input
                        type="file"
                        ref={cameraInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                      />

                      {/* Dropzone with Camera Buttons */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto w-full">
                        <button
                          type="button"
                          onClick={triggerCameraSelect}
                          className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-2xl hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30 transition-all group shadow-sm"
                        >
                          <Camera className="w-10 h-10 text-emerald-500 group-hover:scale-110 transition-transform mb-3" />
                          <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Take Photo / Capture</span>
                          <span className="text-xs text-emerald-500/70 mt-1">Open mobile device camera</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={triggerFileSelect}
                          className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-2xl hover:bg-blue-100/50 dark:hover:bg-blue-950/30 transition-all group shadow-sm"
                        >
                          <Upload className="w-10 h-10 text-blue-500 group-hover:scale-110 transition-transform mb-3" />
                          <span className="font-bold text-sm text-blue-700 dark:text-blue-400">Select Files / Gallery</span>
                          <span className="text-xs text-blue-500/70 mt-1">PNG, JPG, WEBP, HEIC</span>
                        </button>
                      </div>

                      {/* File previews */}
                      {filePreviews.length > 0 && (
                        <div className="space-y-2 max-w-xl mx-auto w-full">
                          <div className="text-xs font-semibold text-gray-500">Selected Images ({files.length})</div>
                          <div className="flex flex-wrap gap-3 overflow-auto max-h-[140px] p-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
                            {filePreviews.map((url, index) => (
                              <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white dark:bg-gray-700 flex-shrink-0 group">
                                <img src={url} alt="menu file" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="absolute top-0.5 right-0.5 p-1 bg-red-500 text-white rounded-full opacity-80 group-hover:opacity-100 hover:scale-110 shadow-md transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter className="flex-shrink-0 pt-4 border-t border-gray-100 dark:border-gray-800/60 flex sm:justify-between items-center">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Gemini AI will extract categories, prices, and size variants automatically.
                  </span>
                  <Button
                    onClick={handleParse}
                    disabled={isParsing || (activeTab === "text" ? !rawText.trim() : files.length === 0)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg rounded-xl px-6"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Parse Menu
                  </Button>
                </DialogFooter>
              </div>
            )
          ) : (
            /* Review and Edit Preview Step */
            <div className="h-full flex flex-col space-y-4">
              <div className="flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/30 p-2.5 rounded-xl text-xs gap-3">
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 min-w-0">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="truncate">Extracted {parsedItems.length} items.</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {Object.keys(categoryMappings).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCategoriesManager(!showCategoriesManager)}
                      className={`text-xs h-7 px-2.5 rounded-lg border-amber-250 dark:border-amber-900/40 ${
                        showCategoriesManager 
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300" 
                          : "bg-amber-50/40 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      📁 {showCategoriesManager ? "Hide" : "Manage"} Categories ({Object.keys(categoryMappings).length})
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setParsedItems([])}
                    className="text-xs h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* New Categories Manager */}
              {Object.keys(categoryMappings).length > 0 && showCategoriesManager && (
                <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 p-3 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    📁 New Categories Settings
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Map new categories to existing ones, or toggle on to create them automatically.
                  </p>
                  <div className="grid grid-cols-1 gap-2 pt-1 max-h-[160px] overflow-auto">
                    {Object.entries(categoryMappings).map(([newCat, mapping]) => (
                      <div key={newCat} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-lg gap-2">
                        <span className="font-semibold text-xs text-gray-750 dark:text-gray-300 truncate">
                          {newCat}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <Switch
                              size="sm"
                              checked={mapping.create}
                              onCheckedChange={(checked) => {
                                setCategoryMappings((prev) => ({
                                  ...prev,
                                  [newCat]: { ...prev[newCat], create: checked }
                                }));
                              }}
                            />
                            <span className="text-[10px] font-medium text-gray-500">
                              {mapping.create ? "Create DB" : "Map Default"}
                            </span>
                          </div>
                          {!mapping.create && (
                            <Select
                              value={mapping.mapTo}
                              onValueChange={(val) => {
                                setCategoryMappings((prev) => ({
                                  ...prev,
                                  [newCat]: { ...prev[newCat], mapTo: val }
                                }));
                              }}
                            >
                              <SelectTrigger className="h-7 w-[120px] text-[10px] bg-gray-50 dark:bg-gray-700 border-gray-200">
                                <SelectValue placeholder="Map to..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-[120px] bg-white dark:bg-gray-800">
                                {categories.map((c) => (
                                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto min-h-0 pr-1">
                <div className="block md:hidden space-y-3">
                  {parsedItems.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-xl p-3 shadow-sm space-y-2.5 relative"
                    >
                      {/* Row 1: Name and Delete button */}
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Item Name"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
                          className="h-9 bg-gray-50/50 dark:bg-gray-900/40 text-sm font-semibold border-gray-200 focus:border-emerald-500 flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Row 2: Category and Price */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-0.5">Category</span>
                          <Select
                            value={item.category}
                            onValueChange={(val) => handleUpdateItem(index, "category", val)}
                          >
                            <SelectTrigger className="h-9 bg-gray-50/50 dark:bg-gray-900/40 text-xs border-gray-200">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[160px] bg-white dark:bg-gray-800">
                              {dropdownCategories.map((c) => (
                                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-0.5">Base Price</span>
                          <Input
                            type="number"
                            placeholder="Price"
                            value={item.price}
                            onChange={(e) => handleUpdateItem(index, "price", parseFloat(e.target.value) || 0)}
                            className="h-9 bg-gray-50/50 dark:bg-gray-900/40 text-xs border-gray-200"
                            disabled={item.variants && item.variants.length > 0}
                          />
                        </div>
                      </div>

                      {/* Row 3: Veg & Special Switches */}
                      <div className="grid grid-cols-2 gap-2 bg-gray-50/50 dark:bg-gray-900/20 p-2 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            size="sm"
                            checked={item.is_veg}
                            onCheckedChange={(val) => handleUpdateItem(index, "is_veg", val)}
                          />
                          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            {item.is_veg ? "🥬 Veg" : "🍖 Non-Veg"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Switch
                            size="sm"
                            checked={item.is_special}
                            onCheckedChange={(val) => handleUpdateItem(index, "is_special", val)}
                          />
                          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            ⭐ Special
                          </span>
                        </div>
                      </div>

                      {/* Row 4: Description */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-0.5">Description</span>
                        <Textarea
                          placeholder="Description..."
                          value={item.description}
                          onChange={(e) => handleUpdateItem(index, "description", e.target.value)}
                          className="min-h-[40px] text-xs bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 focus:border-emerald-500 resize-none py-1.5"
                        />
                      </div>

                      {/* Row 5: Size Variants */}
                      <div className="pt-0.5 border-t border-gray-100 dark:border-gray-700/60 mt-1">
                        {item.variants && item.variants.length > 0 ? (
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Size Variants</div>
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {item.variants.map((v, vIdx) => (
                                <div key={vIdx} className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-medium border border-emerald-100 dark:border-emerald-900/40 rounded-full">
                                  <span>{v.name}: ₹{v.price}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariant(index, vIdx)}
                                    className="text-emerald-400 hover:text-emerald-600 hover:scale-110 ml-0.5"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => {
                                  const name = prompt("Size Name (e.g. Half, Full):");
                                  const pr = prompt("Price:");
                                  if (name && pr) {
                                    const parsedPrice = parseFloat(pr);
                                    if (!isNaN(parsedPrice)) handleAddVariant(index, name, parsedPrice);
                                  }
                                }}
                                className="h-5 rounded-full px-2 text-[9px] border-emerald-300 text-emerald-600"
                              >
                                <Plus className="w-2.5 h-2.5 mr-0.5" /> Size
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const name = prompt("Size Name (e.g. Half, Full):");
                              const pr = prompt("Price:");
                              if (name && pr) {
                                const parsedPrice = parseFloat(pr);
                                if (!isNaN(parsedPrice)) {
                                  handleAddVariant(index, "Base", item.price);
                                  handleAddVariant(index, name, parsedPrice);
                                }
                              }
                            }}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                          >
                            + Convert to Size Variants (Half/Full)
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Spreadsheet Table */}
                <div className="hidden md:block border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-800/40">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                        <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-1/4">Name</th>
                        <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-1/6">Category</th>
                        <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-[12%]">Base Price</th>
                        <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-1/4">Variants</th>
                        <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-[10%]">Veg/Special</th>
                        <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 w-1/12 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-gray-700/60">
                      {parsedItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/20 align-top">
                          {/* Name & Description */}
                          <td className="p-3 space-y-1">
                            <Input
                              value={item.name}
                              onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
                              className="h-8 bg-transparent text-sm font-medium border-gray-200 focus:border-emerald-500"
                            />
                            <Textarea
                              placeholder="Add description..."
                              value={item.description}
                              onChange={(e) => handleUpdateItem(index, "description", e.target.value)}
                              className="min-h-[40px] text-xs bg-transparent border-gray-200 focus:border-emerald-500 resize-none"
                            />
                          </td>

                          {/* Category */}
                          <td className="p-3">
                            <Select
                              value={item.category}
                              onValueChange={(val) => handleUpdateItem(index, "category", val)}
                            >
                              <SelectTrigger className="h-8 bg-transparent text-xs border-gray-200">
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[160px] bg-white dark:bg-gray-800">
                                {dropdownCategories.map((c) => (
                                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Price */}
                          <td className="p-3">
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleUpdateItem(index, "price", parseFloat(e.target.value) || 0)}
                              className="h-8 bg-transparent text-xs border-gray-200"
                              disabled={item.variants && item.variants.length > 0}
                            />
                          </td>

                          {/* Variants */}
                          <td className="p-3 space-y-2">
                            {item.variants && item.variants.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {item.variants.map((v, vIdx) => (
                                  <div key={vIdx} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs border border-emerald-100 dark:border-emerald-900/40 rounded-full font-medium">
                                    <span>{v.name}: ₹{v.price}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVariant(index, vIdx)}
                                      className="text-emerald-400 hover:text-emerald-600 hover:scale-110 ml-0.5"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() => {
                                    const name = prompt("Size Name (e.g. Half, Full):");
                                    const pr = prompt("Price:");
                                    if (name && pr) {
                                      const parsedPrice = parseFloat(pr);
                                      if (!isNaN(parsedPrice)) handleAddVariant(index, name, parsedPrice);
                                    }
                                  }}
                                  className="h-6 rounded-full px-2 text-[10px] border-emerald-300 text-emerald-600"
                                >
                                  <Plus className="w-3 h-3 mr-0.5" /> Add
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const name = prompt("Size Name (e.g. Half, Full):");
                                  const pr = prompt("Price:");
                                  if (name && pr) {
                                    const parsedPrice = parseFloat(pr);
                                    if (!isNaN(parsedPrice)) {
                                      handleAddVariant(index, "Base", item.price);
                                      handleAddVariant(index, name, parsedPrice);
                                    }
                                  }
                                }}
                                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                              >
                                + Add Size Variants
                              </button>
                            )}
                          </td>

                          {/* Veg & Special Switches */}
                          <td className="p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                size="sm"
                                checked={item.is_veg}
                                onCheckedChange={(val) => handleUpdateItem(index, "is_veg", val)}
                              />
                              <span className="text-xs font-medium">{item.is_veg ? "🥬 Veg" : "🍖 Non"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                size="sm"
                                checked={item.is_special}
                                onCheckedChange={(val) => handleUpdateItem(index, "is_special", val)}
                              />
                              <span className="text-xs font-medium">⭐ Special</span>
                            </div>
                          </td>

                          {/* Remove row */}
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Preview Footer */}
              <DialogFooter className="flex-shrink-0 pt-4 border-t border-gray-100 dark:border-gray-800/60 flex sm:justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Ready to import <strong className="text-emerald-600">{parsedItems.length}</strong> items.
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setParsedItems([])}
                    className="rounded-xl border-gray-200 dark:border-gray-700"
                    disabled={isSaving}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSaveItems}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg rounded-xl px-6"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Import Items
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIImportDialog;
