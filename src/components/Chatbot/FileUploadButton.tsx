
import React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface FileUploadButtonProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isDisabled: boolean;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({ 
  fileInputRef, 
  onFileUpload, 
  isDisabled 
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="mb-2 text-xs"
          disabled={isDisabled}
        >
          <Upload className="h-3 w-3 mr-1" /> Upload File for Analysis
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 bg-white dark:bg-slate-800 border shadow-md">
        <div className="text-sm text-muted-foreground mb-2">
          Upload a file for AI analysis (CSV, Excel, PDF, images)
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileUpload}
          className="text-xs w-full"
          accept="image/*,.csv,.xlsx,.xls,.pdf,.ppt,.pptx"
          disabled={isDisabled}
        />
      </PopoverContent>
    </Popover>
  );
};

export default FileUploadButton;
