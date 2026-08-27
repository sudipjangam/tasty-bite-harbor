import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Camera,
  Loader2,
  Sparkles,
  AlertCircle,
  X,
  RotateCcw,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
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
  const [isConverting, setIsConverting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Convert HEIC / HEIF / standard image to optimized base64 JPEG
  const processImageFile = async (
    inputFile: File
  ): Promise<{ dataUrl: string; processedFile: File }> => {
    const isHeic =
      inputFile.name.toLowerCase().endsWith(".heic") ||
      inputFile.name.toLowerCase().endsWith(".heif") ||
      inputFile.type === "image/heic" ||
      inputFile.type === "image/heif";

    let workingBlob: Blob = inputFile;

    if (isHeic) {
      setIsConverting(true);
      setProcessingStep("Converting iOS HEIC image...");
      try {
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({
          blob: inputFile,
          toType: "image/jpeg",
          quality: 0.88,
        });
        workingBlob = Array.isArray(converted) ? converted[0] : converted;
      } catch (heicError) {
        console.warn("HEIC conversion fallback:", heicError);
      } finally {
        setIsConverting(false);
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Scale down if oversized to prevent memory issues and stay within Gemini limits
          const MAX_DIM = 2400;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
            const cleanName = inputFile.name.replace(/\.hei[cf]$/i, ".jpg");
            const processedFile = new File([workingBlob], cleanName, {
              type: "image/jpeg",
            });
            resolve({ dataUrl, processedFile });
          } else {
            const rawUrl = e.target?.result as string;
            resolve({ dataUrl: rawUrl, processedFile: inputFile });
          }
        };
        img.onerror = () => {
          const rawUrl = e.target?.result as string;
          resolve({ dataUrl: rawUrl, processedFile: inputFile });
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(workingBlob);
    });
  };

  const handleSelectedFile = async (selectedFile?: File) => {
    if (!selectedFile) return;

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError("File is too large. Please select an image under 15MB.");
      return;
    }

    setError(null);
    try {
      const { dataUrl, processedFile } = await processImageFile(selectedFile);
      setFile(processedFile);
      setPreview(dataUrl);
    } catch (err: any) {
      console.error("Failed to process image:", err);
      setError("Failed to load image. Please try another photo.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleSelectedFile(selected);
    }
    // reset input so same file can be selected again
    e.target.value = "";
  };

  // Clipboard paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!open) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            handleSelectedFile(pastedFile);
            toast({
              title: "Image Pasted",
              description: "Successfully loaded bill image from clipboard.",
            });
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open, toast]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleSelectedFile(droppedFile);
    }
  };

  const handleExtractWithGemini = async () => {
    if (!preview) return;

    setIsProcessing(true);
    setError(null);
    setProcessingStep("Preparing high-resolution scan...");

    try {
      setProcessingStep("Gemini AI is analyzing bill items & prices...");

      const { data, error: funcError } = await supabase.functions.invoke(
        "extract-bill-details",
        {
          body: { image: preview },
        }
      );

      if (funcError) {
        console.error("Function error:", funcError);
        throw new Error(funcError.message || "Failed to process image with AI");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data || !Array.isArray(data.items)) {
        throw new Error("Could not parse invoice items from this image format");
      }

      setProcessingStep("Extraction complete!");

      toast({
        title: "Bill Extracted Successfully",
        description: `Found ${data.items.length} items from ${
          data.vendor?.name || "supplier"
        }. Review and edit details below.`,
      });

      onDataExtracted(data as ExtractedBillData);
      handleClose();
    } catch (err: any) {
      console.error("Error extracting bill:", err);
      setError(
        err.message ||
          "Failed to extract bill details. Please check lighting or crop and try again."
      );
      toast({
        title: "Extraction Failed",
        description:
          err.message || "Could not extract details. Please try another photo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setIsProcessing(false);
    setIsConverting(false);
    setProcessingStep("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg p-0 overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-emerald-500/20 shadow-2xl rounded-3xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-5 sm:p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white leading-tight">
                Scan Bill / Invoice with AI
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Capture or upload bill photos to auto-extract items and prices
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Hidden inputs for camera capture and gallery selection */}
        <input
          type="file"
          ref={cameraInputRef}
          className="hidden"
          accept="image/*,.heic,.heif"
          capture="environment"
          onChange={handleFileChange}
        />
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,.heic,.heif"
          onChange={handleFileChange}
        />

        <div className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {!preview ? (
            /* Upload / Capture Selection Grid */
            <div
              className="space-y-3"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="text-center pb-1">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Upload or Capture your inventory bill:
                </p>
              </div>

              {/* Option 1: Take Photo / Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isConverting || isProcessing}
                className="w-full group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-emerald-400/80 dark:border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 hover:border-emerald-500 transition-all duration-200 active:scale-[0.99] cursor-pointer"
              >
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2.5 group-hover:scale-110 transition-transform">
                  <Camera className="h-6 w-6" />
                </div>
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  Take Photo / Capture
                </span>
                <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                  Open mobile device camera
                </span>
              </button>

              {/* Option 2: Select Files / Gallery */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isConverting || isProcessing}
                className="w-full group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-blue-300/80 dark:border-blue-500/50 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:border-blue-400 transition-all duration-200 active:scale-[0.99] cursor-pointer"
              >
                <div className="h-12 w-12 rounded-2xl bg-blue-500/15 dark:bg-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2.5 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
                  Select Files / Gallery
                </span>
                <span className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                  PNG, JPG, WEBP, HEIC, HEIF
                </span>
              </button>

              {/* iOS / Formats note */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 pt-1">
                <span>📱 Supports iPhone (HEIC) & Android photos</span>
                <span>•</span>
                <span>Max 15MB</span>
              </div>
            </div>
          ) : (
            /* Image Preview & Action Card */
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-950/5 dark:bg-gray-950/40 max-h-[320px] flex items-center justify-center">
                <img
                  src={preview}
                  alt="Bill Preview"
                  className="max-h-[300px] w-auto object-contain rounded-xl p-2"
                />

                {/* Remove button */}
                {!isProcessing && (
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-full border-4 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                      <Sparkles className="h-6 w-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">
                        Analyzing Bill
                      </p>
                      <p className="text-xs text-emerald-300 animate-pulse">
                        {processingStep || "Extracting items with Gemini AI..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons for selected image */}
              {!isProcessing && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 rounded-xl text-xs h-9 border-gray-200 dark:border-gray-700"
                  >
                    <Camera className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                    Retake
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-xl text-xs h-9 border-gray-200 dark:border-gray-700"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                    Change Image
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 pt-2 pb-5 bg-gray-50/60 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[11px]">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Gemini AI extracts item names, units, quantities & totals</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 sm:flex-none rounded-xl text-xs h-10 px-4"
            >
              Cancel
            </Button>

            {preview && (
              <Button
                onClick={handleExtractWithGemini}
                disabled={isProcessing || isConverting}
                className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold h-10 px-5 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Extract Details
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
