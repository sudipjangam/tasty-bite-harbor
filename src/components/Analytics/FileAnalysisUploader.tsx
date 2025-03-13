
import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileUp, File, FileText, FileSpreadsheet, Image } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ExcelAnalyzer from './ExcelAnalyzer';

interface FileAnalysisUploaderProps {
  onFileUploaded: (fileData: {
    name: string;
    type: string;
    date: string;
    insights: string;
    url?: string;
  }) => void;
  variant?: 'button' | 'inline';
}

const FileAnalysisUploader: React.FC<FileAnalysisUploaderProps> = ({ 
  onFileUploaded, 
  variant = 'button' 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const { toast } = useToast();

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) {
      return <FileSpreadsheet className="h-4 w-4" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="h-4 w-4" />;
    } else if (fileType.includes('image')) {
      return <Image className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log("Files selected:", files.length, "First file:", files[0].name, files[0].type);

    // Set the first file for Excel analysis
    const fileToAnalyze = files[0];
    const isExcelFile = fileToAnalyze.type.includes('sheet') || 
                      fileToAnalyze.type.includes('excel') || 
                      fileToAnalyze.type.includes('csv') ||
                      fileToAnalyze.name.endsWith('.xlsx') || 
                      fileToAnalyze.name.endsWith('.xls') || 
                      fileToAnalyze.name.endsWith('.csv');

    setIsUploading(true);
    toast({
      title: "Processing files",
      description: "Your files are being uploaded and analyzed...",
    });

    const promises = Array.from(files).map(async (file) => {
      try {
        console.log("Processing file:", file.name, "Type:", file.type, "Size:", file.size);
        
        // Convert file to base64
        const base64 = await toBase64(file);
        const base64String = base64.split(',')[1]; // Remove data URL part
        
        console.log("File converted to base64, uploading to Supabase...");

        // Upload file to Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('upload-image', {
          body: { 
            base64Image: base64String, 
            fileName: file.name, 
            fileType: file.type 
          }
        });

        if (error) {
          console.error("Supabase upload error:", error);
          throw error;
        }
        
        console.log("Supabase upload response:", data);

        // Generate analysis based on file type
        let analysis = '';
        
        if (file.type.includes('sheet') || file.type.includes('excel') || file.type.includes('csv')) {
          analysis = generateSpreadsheetAnalysis(file.name);
        } else if (file.type.includes('pdf')) {
          analysis = generatePDFAnalysis(file.name);
        } else if (file.type.includes('image')) {
          analysis = "Image analysis completed. Visual data processed.";
        } else {
          analysis = "File processed. Document insights will be available soon.";
        }

        const fileResult = {
          name: file.name,
          type: getFileType(file.type),
          date: new Date().toISOString().split('T')[0],
          insights: analysis,
          url: data?.image?.url || ''
        };
        
        console.log("File upload complete, result:", fileResult);
        
        // File upload success
        return fileResult;
      } catch (error) {
        console.error("File upload error:", error);
        toast({
          title: "Upload Error",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive",
        });
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validResults = results.filter(Boolean);

    setIsUploading(false);
    
    if (validResults.length > 0) {
      console.log("All files processed successfully:", validResults);
      
      toast({
        title: "Files Uploaded",
        description: `${validResults.length} files have been uploaded for analysis.`,
      });

      // Notify parent component about the uploaded files
      validResults.forEach(fileData => {
        if (fileData) onFileUploaded(fileData);
      });
      
      // If this is an Excel file, show the analyzer
      if (isExcelFile) {
        console.log("Excel file detected, showing analyzer");
        setCurrentFile(fileToAnalyze);
        setShowAnalyzer(true);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Convert file to base64
  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Get human-readable file type
  const getFileType = (mimeType: string): string => {
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return 'Excel';
    } else if (mimeType.includes('csv')) {
      return 'CSV';
    } else if (mimeType.includes('pdf')) {
      return 'PDF';
    } else if (mimeType.includes('image')) {
      return 'Image';
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return 'PowerPoint';
    } else {
      return 'Document';
    }
  };

  // Generate analysis text for spreadsheet files
  const generateSpreadsheetAnalysis = (fileName: string): string => {
    // In a real app, this would analyze the actual content of the file
    const randomValues = [
      `Order total: ₹${Math.floor(Math.random() * 10000)} with ${Math.floor(Math.random() * 20)} items`,
      `Sales summary: ₹${Math.floor(Math.random() * 50000)} revenue, ${Math.floor(Math.random() * 100)} transactions`,
      `Inventory report: ${Math.floor(Math.random() * 50)} items below reorder level`,
      `Staff report: ${Math.floor(Math.random() * 30)} staff members, ${Math.floor(Math.random() * 160)} hours scheduled`
    ];
    
    return randomValues[Math.floor(Math.random() * randomValues.length)];
  };

  // Generate analysis text for PDF files
  const generatePDFAnalysis = (fileName: string): string => {
    // In a real app, this would analyze the actual content of the file
    const randomValues = [
      "Vendor invoice analyzed. Recommended for approval.",
      "Financial statement reviewed. Key metrics extracted.",
      "Tax document processed. Important dates identified.",
      "Business report analyzed. Strategic insights generated."
    ];
    
    return randomValues[Math.floor(Math.random() * randomValues.length)];
  };

  const handleCloseAnalyzer = () => {
    console.log("Closing analyzer");
    setShowAnalyzer(false);
    setCurrentFile(null);
  };

  // Inline variant (used within document repository)
  if (variant === 'inline') {
    return (
      <>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.gif,.ppt,.pptx"
        />
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <FileUp className="h-4 w-4" />
          <span>{isUploading ? "Uploading..." : "Upload Files"}</span>
        </Button>
        
        {/* Excel Analyzer Dialog */}
        <ExcelAnalyzer 
          isOpen={showAnalyzer} 
          onClose={handleCloseAnalyzer}
          fileData={currentFile || undefined}
        />
      </>
    );
  }

  // Button variant with popover (used in dashboard header)
  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            className="flex items-center gap-2" 
            variant="default" 
            disabled={isUploading}
          >
            <FileUp className="h-4 w-4" />
            <span>{isUploading ? "Uploading..." : "Upload Data"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4">
          <div className="space-y-4">
            <h3 className="font-medium">Upload Business Documents</h3>
            <p className="text-sm text-muted-foreground">
              Upload business data files for analysis. Supported formats include Excel, CSV, PDF, and images.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel/CSV: Sales, inventory, staff reports
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <FileText className="h-4 w-4 mr-2" />
                PDF: Invoices, financial statements
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Image className="h-4 w-4 mr-2" />
                Images: Receipts, documents
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="text-sm w-full"
              multiple
              accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.gif,.ppt,.pptx"
            />
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Excel Analyzer Dialog */}
      <ExcelAnalyzer 
        isOpen={showAnalyzer} 
        onClose={handleCloseAnalyzer}
        fileData={currentFile || undefined}
      />
    </div>
  );
};

export default FileAnalysisUploader;
