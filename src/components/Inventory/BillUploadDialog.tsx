import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExtractedBillData } from "@/utils/billUtils";

interface BillUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted: (data: ExtractedBillData) => void;
}

export const BillUploadDialog: React.FC<BillUploadDialogProps> = ({
  open,
  onOpenChange,
  onDataExtracted,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size too large. Please select an image under 5MB.");
        return;
      }
      setFile(selectedFile);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      if (droppedFile.size > 5 * 1024 * 1024) {
        setError("File size too large. Please select an image under 5MB.");
        return;
      }
      setFile(droppedFile);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    }
  };

  const handleProcessing = async () => {
    if (!preview) return;

    setIsProcessing(true);
    setError(null);

    try {
      console.log("Invoking extract-bill-details function...");
      const { data, error } = await supabase.functions.invoke(
        "extract-bill-details",
        {
          body: { image: preview },
        }
      );

      if (error) {
        console.error("Function error:", error);
        throw new Error(error.message || "Failed to process image");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log("Extracted data:", data);

      // Validate data structure
      if (!data || !data.items) {
        throw new Error("Invalid response format from AI");
      }

      toast({
        title: "Bill Extracted Successfully",
        description: `Found ${data.items?.length || 0} items from ${
          data.vendor?.name || "unknown supplier"
        }.`,
      });

      onDataExtracted(data as ExtractedBillData);
      onOpenChange(false);
      // Reset state for next time
      setFile(null);
      setPreview(null);
    } catch (err: any) {
      console.error("Error extracting bill:", err);
      setError(
        err.message || "Failed to extract bill details. Please try again."
      );
      toast({
        title: "Extraction Failed",
        description: err.message || "Could not extract details from the image",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            Upload Bill / Invoice
          </DialogTitle>
          <DialogDescription>
            Upload an image of your bill to automatically extract details using
            AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              preview
                ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/10"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />

            {preview ? (
              <div className="relative w-full aspect-[3/4] max-h-[300px] overflow-hidden rounded-lg">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-white font-medium">Click to change</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-full mb-4">
                  <Upload className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG or JPEG (max 5MB)
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleProcessing}
            disabled={!file || isProcessing}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Extract Details
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
